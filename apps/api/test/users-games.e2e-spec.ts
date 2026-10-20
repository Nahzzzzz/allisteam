import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createGame, createTestApp, hasTestDb, registerUser, resetDatabase } from './utils';

describe.skipIf(!hasTestDb)('资料与游戏档案', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /me 返回当前用户资料，且不泄漏密码哈希', async () => {
    const session = await registerUser(app);

    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(response.body.id).toBe(session.userId);
    expect(response.body.nickname).toBe('测试用户');
    expect(response.body.passwordHash).toBeUndefined();
    expect(response.body.trustScore).toBe(60);
  });

  it('未登录访问 /me 返回 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/me').expect(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /me 修改昵称与城市', async () => {
    const session = await registerUser(app);

    const response = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ nickname: '新昵称', city: '成都' })
      .expect(200);

    expect(response.body.nickname).toBe('新昵称');
    expect(response.body.city).toBe('成都');
  });

  it('PATCH /me 空对象与过短昵称都返回 400', async () => {
    const session = await registerUser(app);

    const empty = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({})
      .expect(400);
    expect(empty.body.code).toBe('VALIDATION_FAILED');

    await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ nickname: '短' })
      .expect(400);
  });

  it('游戏档案：新增、重复返回 409、列表可见、删除后为空', async () => {
    const session = await registerUser(app);
    const gameId = await createGame(app, '英雄联盟');

    const created = await request(app.getHttpServer())
      .post('/api/v1/me/games')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ gameId, platform: 'PC', rankText: '铂金', voiceOk: true })
      .expect(201);

    expect(created.body.gameName).toBe('英雄联盟');
    expect(created.body.platform).toBe('PC');

    const duplicated = await request(app.getHttpServer())
      .post('/api/v1/me/games')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ gameId, platform: 'PC' })
      .expect(409);
    expect(duplicated.body.code).toBe('GAME_PROFILE_EXISTS');

    const list = await request(app.getHttpServer())
      .get('/api/v1/me/games')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/me/games/${created.body.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get('/api/v1/me/games')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(afterDelete.body).toHaveLength(0);
  });

  it('不能删除别人的游戏档案（返回 404，不暴露是否存在）', async () => {
    const owner = await registerUser(app);
    const other = await registerUser(app);
    const gameId = await createGame(app, 'CS2');

    const created = await request(app.getHttpServer())
      .post('/api/v1/me/games')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ gameId, platform: 'PC' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/me/games/${created.body.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(404);

    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('GET /games 公开可访问且只返回启用的游戏', async () => {
    await createGame(app, '无畏契约');

    const response = await request(app.getHttpServer()).get('/api/v1/games').expect(200);
    expect(response.body.some((game: { name: string }) => game.name === '无畏契约')).toBe(true);
  });
});
