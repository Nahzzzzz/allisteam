import type { INestApplication } from '@nestjs/common';
import type { MessageView } from '@allisteam/shared';
import { WS_EVENTS } from '@allisteam/shared';
import type { Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createGame,
  createTestApp,
  createUserSession,
  futureIso,
  hasTestDb,
  listenOnRandomPort,
  resetDatabase,
  type TestSession,
} from './utils';
import {
  connectChat,
  expectAuthRejected,
  joinRoom,
  sendChat,
  waitForDisconnect,
  waitForEvent,
} from './ws-utils';

describe.skipIf(!hasTestDb)('局内聊天', () => {
  let app: INestApplication;
  let baseUrl: string;
  let host: TestSession;
  let gameId: string;

  beforeAll(async () => {
    app = await createTestApp();
    baseUrl = await listenOnRandomPort(app);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    host = await createUserSession(app, '发起人');
    gameId = await createGame(app, '英雄联盟');
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPost(capacity = 4): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send({
        domain: 'GAME',
        title: '周末组排缺人速来',
        description: '能开麦就行，心态好一点。',
        startTime: futureIso(6),
        capacity,
        game: { gameId, platform: 'PC' },
      })
      .expect(201);

    return response.body.id as string;
  }

  /** 报名并审批通过，返回成员 session */
  async function addMember(postId: string, nickname: string): Promise<TestSession> {
    const member = await createUserSession(app, nickname);
    const applied = await request(app.getHttpServer())
      .post(`/api/v1/posts/${postId}/applications`)
      .set('Authorization', `Bearer ${member.accessToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${applied.body.id}`)
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send({ action: 'APPROVE' })
      .expect(200);

    return member;
  }

  function getMessages(postId: string, session: TestSession, query = '') {
    return request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}/messages${query}`)
      .set('Authorization', `Bearer ${session.accessToken}`);
  }

  it(
    '成员发消息：发起人实时收到，历史可查',
    async () => {
      const postId = await createPost();
      const guest = await addMember(postId, '申请人');

      const hostSocket = await connectChat(baseUrl, host.accessToken);
      const guestSocket = await connectChat(baseUrl, guest.accessToken);
      try {
        await expect(joinRoom(hostSocket, postId)).resolves.toMatchObject({ ok: true });
        await expect(joinRoom(guestSocket, postId)).resolves.toMatchObject({ ok: true });

        const received = waitForEvent<MessageView>(hostSocket, WS_EVENTS.messageNew);
        const ack = await sendChat(guestSocket, { postId, content: '晚上八点见' });
        expect(ack.ok).toBe(true);
        if (!ack.ok) {
          return;
        }

        const push = await received;
        expect(push.id).toBe(ack.message.id);
        expect(push.content).toBe('晚上八点见');
        expect(push.sender?.nickname).toBe('申请人');
        expect(push.type).toBe('TEXT');

        const history = await getMessages(postId, host).expect(200);
        const contents = (history.body.items as MessageView[]).map((item) => item.content);
        // 审批时写入的系统消息也在历史里，新的在前
        expect(contents).toContain('晚上八点见');
        expect(contents).toContain('申请人 加入了局');
        expect(history.body.items[0].id).toBe(ack.message.id);
      } finally {
        hostSocket.disconnect();
        guestSocket.disconnect();
      }
    },
    30_000,
  );

  it('非成员读历史返回 403 NOT_POST_MEMBER', async () => {
    const postId = await createPost();
    const outsider = await createUserSession(app, '路人');

    const response = await getMessages(postId, outsider).expect(403);
    expect(response.body.code).toBe('NOT_POST_MEMBER');

    const anonymous = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}/messages`)
      .expect(401);
    expect(anonymous.body.code).toBe('UNAUTHORIZED');
  });

  it(
    '非成员加入房间被拒绝并断开连接',
    async () => {
      const postId = await createPost();
      const outsider = await createUserSession(app, '路人');
      const socket = await connectChat(baseUrl, outsider.accessToken);

      try {
        const ack = await joinRoom(socket, postId);
        expect(ack).toMatchObject({ ok: false, code: 'NOT_POST_MEMBER' });
        await waitForDisconnect(socket);
        expect(socket.connected).toBe(false);
      } finally {
        socket.disconnect();
      }
    },
    20_000,
  );

  it(
    '无效令牌的 WebSocket 连接会被服务端断开',
    async () => {
      await expectAuthRejected(baseUrl, 'not-a-valid-token');
    },
    20_000,
  );

  it(
    '没进房间不能发消息，取消后的局也不能发',
    async () => {
      const postId = await createPost();
      const guest = await addMember(postId, '申请人');
      const socket = await connectChat(baseUrl, guest.accessToken);

      try {
        const rejected = await sendChat(socket, { postId, content: '直接发' });
        expect(rejected).toMatchObject({ ok: false, code: 'FORBIDDEN' });

        await joinRoom(socket, postId);

        const cancelled = waitForEvent<{ postId: string }>(socket, WS_EVENTS.postCancelled);
        await request(app.getHttpServer())
          .delete(`/api/v1/posts/${postId}`)
          .set('Authorization', `Bearer ${host.accessToken}`)
          .expect(200);
        await expect(cancelled).resolves.toMatchObject({ postId });

        const closed = await sendChat(socket, { postId, content: '还能发吗' });
        expect(closed).toMatchObject({ ok: false, code: 'POST_NOT_OPEN' });
      } finally {
        socket.disconnect();
      }
    },
    30_000,
  );

  it(
    'after 参数只补拉锚点之后的消息',
    async () => {
      const postId = await createPost();
      const guest = await addMember(postId, '申请人');
      const socket = await connectChat(baseUrl, guest.accessToken);
      const sockets: Socket[] = [socket];

      try {
        await joinRoom(socket, postId);

        const first = await sendChat(socket, { postId, content: '第一条' });
        await sendChat(socket, { postId, content: '第二条' });
        expect(first.ok).toBe(true);
        if (!first.ok) {
          return;
        }

        const page = await getMessages(
          postId,
          host,
          `?after=${encodeURIComponent(first.message.id)}`,
        ).expect(200);

        const contents = (page.body.items as MessageView[]).map((item) => item.content);
        expect(contents).toEqual(['第二条']);
      } finally {
        sockets.forEach((item) => item.disconnect());
      }
    },
    30_000,
  );

  it('游标无效返回 400，锚点消息不存在返回 404', async () => {
    const postId = await createPost();

    const badCursor = await getMessages(postId, host, '?cursor=not-base64-json').expect(400);
    expect(badCursor.body.code).toBe('VALIDATION_FAILED');

    const missingAnchor = await getMessages(postId, host, '?after=missing-message-id').expect(404);
    expect(missingAnchor.body.code).toBe('NOT_FOUND');
  });
});
