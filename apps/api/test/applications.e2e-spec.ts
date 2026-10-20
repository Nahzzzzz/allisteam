import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createGame,
  createTestApp,
  createUserSession,
  futureIso,
  hasTestDb,
  resetDatabase,
  type TestSession,
} from './utils';

describe.skipIf(!hasTestDb)('报名与审批', () => {
  let app: INestApplication;
  let host: TestSession;
  let gameId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    host = await createUserSession(app, '发起人');
    gameId = await createGame(app, '英雄联盟');
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPost(capacity: number, title = '周末组排缺人速来'): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send({
        domain: 'GAME',
        title,
        description: '能开麦就行，心态好一点。',
        startTime: futureIso(6),
        capacity,
        game: { gameId, platform: 'PC' },
      })
      .expect(201);

    return response.body.id as string;
  }

  function applyAs(postId: string, session: TestSession, message?: string) {
    return request(app.getHttpServer())
      .post(`/api/v1/posts/${postId}/applications`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(message === undefined ? {} : { message });
  }

  function decideAs(
    applicationId: string,
    session: TestSession,
    body: { action: 'APPROVE' | 'REJECT'; rejectReason?: string },
  ) {
    return request(app.getHttpServer())
      .patch(`/api/v1/applications/${applicationId}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  it('报名 → 审批通过 → 满员成团', async () => {
    const postId = await createPost(2);
    const guest = await createUserSession(app, '申请人');

    const applied = await applyAs(postId, guest, '晚上八点能到').expect(201);
    expect(applied.body.status).toBe('PENDING');
    expect(applied.body.message).toBe('晚上八点能到');

    const list = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}/applications`)
      .set('Authorization', `Bearer ${host.accessToken}`)
      .expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].applicant.id).toBe(guest.userId);

    const approved = await decideAs(applied.body.id, host, { action: 'APPROVE' }).expect(200);
    expect(approved.body.status).toBe('APPROVED');

    const detail = await request(app.getHttpServer()).get(`/api/v1/posts/${postId}`).expect(200);
    expect(detail.body.memberCount).toBe(2);
    expect(detail.body.status).toBe('FULL');
    expect(detail.body.members.map((m: { userId: string }) => m.userId)).toContain(guest.userId);
  });

  it('同一用户重复报名返回 409 ALREADY_APPLIED', async () => {
    const postId = await createPost(4);
    const guest = await createUserSession(app, '申请人');

    await applyAs(postId, guest).expect(201);

    const second = await applyAs(postId, guest).expect(409);
    expect(second.body.code).toBe('ALREADY_APPLIED');
  });

  it('发起人报名自己的局返回 403', async () => {
    const postId = await createPost(4);

    const response = await applyAs(postId, host).expect(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('非发起人审批返回 403', async () => {
    const postId = await createPost(4);
    const guest = await createUserSession(app, '申请人');
    const outsider = await createUserSession(app, '路人');

    const applied = await applyAs(postId, guest).expect(201);

    const response = await decideAs(applied.body.id, outsider, { action: 'APPROVE' }).expect(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('重复审批返回 409 ALREADY_DECIDED', async () => {
    const postId = await createPost(4);
    const guest = await createUserSession(app, '申请人');
    const applied = await applyAs(postId, guest).expect(201);

    await decideAs(applied.body.id, host, { action: 'APPROVE' }).expect(200);

    const again = await decideAs(applied.body.id, host, { action: 'APPROVE' }).expect(409);
    expect(again.body.code).toBe('ALREADY_DECIDED');
  });

  it('撤回后可以重新报名，被拒绝后 7 天内不能再报', async () => {
    const postId = await createPost(4);
    const guest = await createUserSession(app, '申请人');

    const applied = await applyAs(postId, guest).expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/applications/${applied.body.id}`)
      .set('Authorization', `Bearer ${guest.accessToken}`)
      .expect(200);

    const reapplied = await applyAs(postId, guest).expect(201);
    expect(reapplied.body.status).toBe('PENDING');

    await decideAs(reapplied.body.id, host, { action: 'REJECT', rejectReason: '时间不合适' }).expect(
      200,
    );

    const blocked = await applyAs(postId, guest).expect(409);
    expect(blocked.body.code).toBe('ALREADY_APPLIED');
  });

  it('满员的局不能再报名，也不能再通过待审批的申请', async () => {
    const postId = await createPost(2);
    const first = await createUserSession(app, '申请人甲');
    const second = await createUserSession(app, '申请人乙');
    const late = await createUserSession(app, '迟到的申请人');

    const applied = await applyAs(postId, first).expect(201);
    const queued = await applyAs(postId, second).expect(201);

    await decideAs(applied.body.id, host, { action: 'APPROVE' }).expect(200);

    const response = await applyAs(postId, late).expect(409);
    expect(response.body.code).toBe('POST_FULL');

    // 满员后再通过队列里的申请必须失败，名额不能被突破
    const overApprove = await decideAs(queued.body.id, host, { action: 'APPROVE' }).expect(409);
    expect(overApprove.body.code).toBe('POST_FULL');

    const detail = await request(app.getHttpServer()).get(`/api/v1/posts/${postId}`).expect(200);
    expect(detail.body.memberCount).toBe(2);
    expect(detail.body.status).toBe('FULL');
  });

  it(
    '10 并发审批抢 3 个名额，成功数恰好为 3',
    async () => {
      const postId = await createPost(4);
      const applicants: TestSession[] = [];
      for (let i = 0; i < 10; i += 1) {
        applicants.push(await createUserSession(app, `申请人${i}`));
      }

      const applicationIds: string[] = [];
      for (const applicant of applicants) {
        const response = await applyAs(postId, applicant).expect(201);
        applicationIds.push(response.body.id as string);
      }

      const settled = await Promise.all(
        applicationIds.map((id) => decideAs(id, host, { action: 'APPROVE' })),
      );

      const approved = settled.filter((response) => response.status === 200).length;
      const rejectedAsFull = settled.filter(
        (response) => response.status === 409 && response.body.code === 'POST_FULL',
      ).length;

      expect(approved).toBe(3);
      expect(rejectedAsFull).toBe(7);

      const detail = await request(app.getHttpServer()).get(`/api/v1/posts/${postId}`).expect(200);
      expect(detail.body.memberCount).toBe(4);
      expect(detail.body.status).toBe('FULL');
      expect(detail.body.members).toHaveLength(4);
    },
    120_000,
  );
});
