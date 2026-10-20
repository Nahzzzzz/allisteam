import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostLifecycleService } from '../src/modules/posts/post-lifecycle.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createGame,
  createTestApp,
  createUserSession,
  futureIso,
  hasTestDb,
  resetDatabase,
  type TestSession,
} from './utils';

const ADMIN_EMAIL = 'admin@test.local';

describe.skipIf(!hasTestDb)('信任：互评、信誉分、举报与后台', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let host: TestSession;
  let gameId: string;

  beforeAll(async () => {
    // EnvService 在模块初始化时读取，必须在 createTestApp 之前设置
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    host = await createUserSession(app, '发起人');
    gameId = await createGame(app, '英雄联盟');
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPost(capacity = 2, hoursAhead = 6): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send({
        domain: 'GAME',
        title: '周末组排缺人速来',
        description: '能开麦就行，心态好一点。',
        startTime: futureIso(hoursAhead),
        capacity,
        game: { gameId, platform: 'PC' },
      })
      .expect(201);

    return response.body.id as string;
  }

  async function joinAsMember(postId: string, nickname = '队友'): Promise<TestSession> {
    const guest = await createUserSession(app, nickname);
    const applied = await request(app.getHttpServer())
      .post(`/api/v1/posts/${postId}/applications`)
      .set('Authorization', `Bearer ${guest.accessToken}`)
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${applied.body.id}`)
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send({ action: 'APPROVE' })
      .expect(200);
    return guest;
  }

  /** 直接改库把局推到「已结束」，避免依赖定时任务的执行时机 */
  async function endPost(postId: string): Promise<void> {
    await prisma.post.update({
      where: { id: postId },
      data: { status: 'CLOSED', startTime: new Date(Date.now() - 7 * 60 * 60 * 1000) },
    });
  }

  function reviewAs(postId: string, session: TestSession, body: unknown) {
    return request(app.getHttpServer())
      .post(`/api/v1/posts/${postId}/reviews`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body as object);
  }

  async function createAdminSession(): Promise<TestSession> {
    const jwt = app.get(JwtService);
    const user = await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash: 'not-used-in-tests', nickname: '管理员' },
    });
    const accessToken = await jwt.signAsync({ sub: user.id, jti: randomUUID() });
    return { accessToken, refreshCookie: '', userId: user.id };
  }

  it('互评后信誉分按公式更新，并能在用户主页看到评价', async () => {
    const postId = await createPost();
    const guest = await joinAsMember(postId);
    await endPost(postId);

    const created = await reviewAs(postId, guest, {
      toId: host.userId,
      rating: 5,
      comment: '很准时，配合默契',
      tags: ['守时', '友好'],
    }).expect(201);

    expect(created.body.rating).toBe(5);
    expect(created.body.from.id).toBe(guest.userId);
    expect(created.body.to.id).toBe(host.userId);

    const profile = await request(app.getHttpServer())
      .get(`/api/v1/users/${host.userId}`)
      .expect(200);
    // 0.6 * 60 + 0.4 * 5 * 20 = 76
    expect(profile.body.trustScore).toBe(76);
    expect(profile.body.reviewCount).toBe(1);

    const reviews = await request(app.getHttpServer())
      .get(`/api/v1/users/${host.userId}/reviews`)
      .expect(200);
    expect(reviews.body.items).toHaveLength(1);
    expect(reviews.body.items[0].comment).toBe('很准时，配合默契');
    expect(reviews.body.items[0].tags).toEqual(['守时', '友好']);

    const postReviews = await request(app.getHttpServer())
      .get(`/api/v1/posts/${postId}/reviews`)
      .expect(200);
    expect(postReviews.body.items).toHaveLength(1);
  });

  it('重复评价返回 409 ALREADY_REVIEWED', async () => {
    const postId = await createPost();
    const guest = await joinAsMember(postId);
    await endPost(postId);

    await reviewAs(postId, guest, { toId: host.userId, rating: 5 }).expect(201);

    const second = await reviewAs(postId, guest, { toId: host.userId, rating: 3 }).expect(409);
    expect(second.body.code).toBe('ALREADY_REVIEWED');
  });

  it('局未结束时评价返回 409 POST_NOT_ENDED', async () => {
    const postId = await createPost();
    const guest = await joinAsMember(postId);

    const response = await reviewAs(postId, guest, { toId: host.userId, rating: 5 }).expect(409);
    expect(response.body.code).toBe('POST_NOT_ENDED');
  });

  it('非成员评价返回 403，评价自己返回 403', async () => {
    const postId = await createPost();
    const guest = await joinAsMember(postId);
    const outsider = await createUserSession(app, '路人');
    await endPost(postId);

    const outsiderReview = await reviewAs(postId, outsider, {
      toId: host.userId,
      rating: 5,
    }).expect(403);
    expect(outsiderReview.body.code).toBe('NOT_POST_MEMBER');

    const selfReview = await reviewAs(postId, guest, {
      toId: guest.userId,
      rating: 5,
    }).expect(403);
    expect(selfReview.body.code).toBe('FORBIDDEN');
  });

  it('同一目标 24 小时内重复举报返回 409', async () => {
    const guest = await createUserSession(app, '队友');
    const body = { targetType: 'USER', targetId: guest.userId, reason: 'HARASSMENT' };

    await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send(body)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send(body)
      .expect(409);
    expect(second.body.code).toBe('REPORT_DUPLICATE');
    expect(second.body.details.retryAt).toBeTruthy();
  });

  it('举报自己返回 403，举报不存在的局返回 404', async () => {
    const self = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send({ targetType: 'USER', targetId: host.userId, reason: 'SPAM' })
      .expect(403);
    expect(self.body.code).toBe('FORBIDDEN');

    await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send({ targetType: 'POST', targetId: 'not-exist', reason: 'FAKE_INFO' })
      .expect(404);
  });

  it('非管理员访问举报队列返回 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${host.accessToken}`)
      .expect(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('管理员下架被举报的局：作者扣 10 分，举报人收到结果', async () => {
    const postId = await createPost(4);
    const reporter = await createUserSession(app, '举报人');
    const admin = await createAdminSession();

    const report = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .send({ targetType: 'POST', targetId: postId, reason: 'FAKE_INFO', detail: '时间是假的' })
      .expect(201);

    const queue = await request(app.getHttpServer())
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(queue.body.items).toHaveLength(1);
    expect(queue.body.items[0].target.label).toContain('周末组排');

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/reports/${report.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'REMOVE_POST', note: '确认虚构时间' })
      .expect(200);

    const post = await prisma.post.findUniqueOrThrow({ where: { id: postId } });
    expect(post.status).toBe('CANCELLED');

    const author = await prisma.user.findUniqueOrThrow({ where: { id: host.userId } });
    expect(author.trustScore).toBe(50);

    const notification = await prisma.notification.findFirst({
      where: { userId: reporter.userId, type: 'REPORT_RESULT' },
    });
    expect(notification).not.toBeNull();

    // 已处理的举报再次处理必须拒绝，避免重复扣分
    const again = await request(app.getHttpServer())
      .patch(`/api/v1/admin/reports/${report.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'REMOVE_POST' })
      .expect(409);
    expect(again.body.code).toBe('ALREADY_DECIDED');
  });

  it('封禁用户后账号状态变为 SUSPENDED', async () => {
    const target = await createUserSession(app, '骚扰者');
    const admin = await createAdminSession();
    const reporter = await createUserSession(app, '举报人');

    const report = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .send({ targetType: 'USER', targetId: target.userId, reason: 'HARASSMENT' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/reports/${report.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'BAN_USER' })
      .expect(200);

    const banned = await prisma.user.findUniqueOrThrow({ where: { id: target.userId } });
    expect(banned.status).toBe('SUSPENDED');
  });

  it('动作与举报对象类型不匹配返回 400', async () => {
    const target = await createUserSession(app, '骚扰者');
    const admin = await createAdminSession();

    const report = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${host.accessToken}`)
      .send({ targetType: 'USER', targetId: target.userId, reason: 'SPAM' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/admin/reports/${report.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'REMOVE_POST' })
      .expect(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('定时任务把开始超过 6 小时的局置为 CLOSED，其余不受影响', async () => {
    const expiredId = await createPost();
    const recentId = await createPost();
    const cancelledId = await createPost();

    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.post.update({ where: { id: expiredId }, data: { startTime: sevenHoursAgo } });
    await prisma.post.update({ where: { id: recentId }, data: { startTime: oneHourAgo } });
    await prisma.post.update({
      where: { id: cancelledId },
      data: { startTime: sevenHoursAgo, status: 'CANCELLED' },
    });

    const closed = await app.get(PostLifecycleService).closeExpiredPosts();
    expect(closed).toBe(1);

    const [expired, recent, cancelled] = await Promise.all([
      prisma.post.findUniqueOrThrow({ where: { id: expiredId } }),
      prisma.post.findUniqueOrThrow({ where: { id: recentId } }),
      prisma.post.findUniqueOrThrow({ where: { id: cancelledId } }),
    ]);
    expect(expired.status).toBe('CLOSED');
    expect(recent.status).toBe('OPEN');
    expect(cancelled.status).toBe('CANCELLED');
  });
});
