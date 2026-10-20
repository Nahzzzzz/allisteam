import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createGame,
  createTestApp,
  futureIso,
  hasTestDb,
  registerUser,
  resetDatabase,
  type TestSession,
} from './utils';

interface PostInput {
  title: string;
  gameId: string;
  capacity?: number;
  hoursFromNow?: number;
}

describe.skipIf(!hasTestDb)('发局与列表', () => {
  let app: INestApplication;
  let session: TestSession;
  let lolId: string;
  let valorantId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    session = await registerUser(app);
    lolId = await createGame(app, '英雄联盟');
    valorantId = await createGame(app, '无畏契约');
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPost(input: PostInput): Promise<request.Response> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        domain: 'GAME',
        title: input.title,
        description: '一起打两局，要求能开麦，心态好。',
        startTime: futureIso(input.hoursFromNow ?? 6),
        capacity: input.capacity ?? 5,
        game: {
          gameId: input.gameId,
          platform: 'PC',
          mode: '排位',
          needVoice: true,
        },
      });

    // 标题长度要求 8–40 字；这里显式断言，避免创建失败后误导后续断言
    expect(response.status).toBe(201);
    return response;
  }

  it('发局成功：发起人自动成为成员，成员数为 1', async () => {
    const response = await createPost({ title: '今晚排位缺两个人', gameId: lolId });
    expect(response.status).toBe(201);

    expect(response.body.memberCount).toBe(1);
    expect(response.body.isAuthor).toBe(true);
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0].role).toBe('HOST');
    expect(response.body.game.id).toBe(lolId);
  });

  it('开始时间早于当前时间返回 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        domain: 'GAME',
        title: '过去时间的局',
        description: '这条应该被拒绝。',
        startTime: new Date(Date.now() - 60_000).toISOString(),
        capacity: 3,
        game: { gameId: lolId, platform: 'PC' },
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('按游戏筛选只返回该游戏的局', async () => {
    await createPost({ title: '英雄联盟灵活组排', gameId: lolId });
    await createPost({ title: '无畏契约竞技排位', gameId: valorantId });

    const response = await request(app.getHttpServer())
      .get('/api/v1/posts')
      .query({ gameId: valorantId })
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].game.id).toBe(valorantId);
  });

  it('游标分页不重复也不漏项', async () => {
    await createPost({ title: '第一局排位招募缺人', gameId: lolId, hoursFromNow: 3 });
    await createPost({ title: '第二局排位招募缺人', gameId: lolId, hoursFromNow: 5 });
    await createPost({ title: '第三局排位招募缺人', gameId: lolId, hoursFromNow: 7 });

    const first = await request(app.getHttpServer())
      .get('/api/v1/posts')
      .query({ limit: 2 })
      .expect(200);

    expect(first.body.items).toHaveLength(2);
    expect(first.body.hasMore).toBe(true);
    expect(first.body.nextCursor).toBeTypeOf('string');

    const second = await request(app.getHttpServer())
      .get('/api/v1/posts')
      .query({ limit: 2, cursor: first.body.nextCursor })
      .expect(200);

    expect(second.body.items).toHaveLength(1);
    expect(second.body.hasMore).toBe(false);

    const ids = [...first.body.items, ...second.body.items].map((item) => item.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('非作者修改别人的局返回 403', async () => {
    const created = await createPost({ title: '我的局别人不能改', gameId: lolId });
    const other = await registerUser(app);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/posts/${created.body.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ title: '被篡改的标题内容' })
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('我发起的：只返回自己的局，包含已取消的局', async () => {
    const mine = await createPost({ title: '我发起的一个测试局', gameId: lolId });
    const otherSession = await registerUser(app);
    const otherGameId = await createGame(app, 'Dota 2');

    await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${otherSession.accessToken}`)
      .send({
        domain: 'GAME',
        title: '别人的局不应该出现',
        description: '这条属于另一个用户。',
        startTime: futureIso(6),
        capacity: 3,
        game: { gameId: otherGameId, platform: 'PC' },
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/posts/${mine.body.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/v1/me/posts')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].id).toBe(mine.body.id);
    expect(response.body.items[0].status).toBe('CANCELLED');
  });

  it('未登录访问 /me/posts 返回 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/me/posts').expect(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('取消自己的局后再查询列表不再返回', async () => {
    const created = await createPost({ title: '这个局稍后会被取消', gameId: lolId });
    expect(created.status).toBe(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/posts/${created.body.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    const list = await request(app.getHttpServer()).get('/api/v1/posts').expect(200);
    expect(list.body.items).toHaveLength(0);
  });
});
