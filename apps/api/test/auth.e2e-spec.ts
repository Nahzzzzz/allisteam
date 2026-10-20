import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, hasTestDb, registerUser, resetDatabase } from './utils';

describe.skipIf(!hasTestDb)('认证接口', () => {
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

  it('注册成功后返回访问令牌并下发刷新 cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'a@test.local', password: 'abc12345', nickname: '阿澈' })
      .expect(201);

    expect(response.body.accessToken).toBeTypeOf('string');
    expect(response.body.user.email).toBe('a@test.local');
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((value) => value.startsWith('at_refresh='))).toBe(true);
  });

  it('邮箱重复注册返回 409 EMAIL_TAKEN', async () => {
    await registerUserWithEmail(app, 'dup@test.local');
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'dup@test.local', password: 'abc12345', nickname: '第二个' })
      .expect(409);

    expect(response.body.code).toBe('EMAIL_TAKEN');
  });

  it('密码错误返回 401 INVALID_CREDENTIALS', async () => {
    await registerUserWithEmail(app, 'login@test.local');
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'login@test.local', password: 'wrong1234' })
      .expect(401);

    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('未携带令牌访问 /me 返回 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/me').expect(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('refresh 轮换后旧令牌失效并吊销整个家族', async () => {
    const session = await registerUser(app);

    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', session.refreshCookie)
      .expect(201);

    const newCookie = (rotated.headers['set-cookie'] as unknown as string[])
      .find((value) => value.startsWith('at_refresh='))!
      .split(';')[0]!;
    expect(newCookie).not.toBe(session.refreshCookie);

    const reused = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', session.refreshCookie)
      .expect(401);
    expect(reused.body.code).toBe('UNAUTHORIZED');

    // 家族被吊销后，新令牌也不能再用
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', newCookie)
      .expect(401);
  });
});

async function registerUserWithEmail(app: INestApplication, email: string): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'abc12345', nickname: '测试用户' })
    .expect(201);
}
