import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppExceptionFilter } from '../src/common/filters/app-exception.filter';
import { requestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { PrismaService } from '../src/prisma/prisma.service';

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new AppExceptionFilter());
  await app.init();
  return app;
}

export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$executeRaw`TRUNCATE "Review","Message","PostMember","Application","Post","GameInfo","GameProfile","Game","RefreshToken","Block","Notification","Report","User" CASCADE`;
  await clearRateLimits();
}

let rateLimitClient: Redis | null = null;

/**
 * 集成测试共享同一个 Redis，注册/发局都有限流；
 * 每个用例前清掉限流计数器，避免用例之间互相 429。
 */
async function clearRateLimits(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    return;
  }
  rateLimitClient ??= new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  if (rateLimitClient.status === 'wait') {
    await rateLimitClient.connect();
  }
  const keys = await rateLimitClient.keys('rl:*');
  if (keys.length > 0) {
    await rateLimitClient.del(...keys);
  }
}

export async function createGame(app: INestApplication, name: string): Promise<string> {
  const prisma = app.get(PrismaService);
  const game = await prisma.game.create({ data: { name } });
  return game.id;
}

export interface TestSession {
  accessToken: string;
  refreshCookie: string;
  userId: string;
}

export async function registerUser(
  app: INestApplication,
  email = `u${Date.now()}${Math.round(Math.random() * 1e6)}@test.local`,
): Promise<TestSession> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'abc12345', nickname: '测试用户' })
    .expect(201);

  const setCookie = response.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie].filter(Boolean);
  const refreshCookie = cookies.find((value: string) => value.startsWith('at_refresh='));
  if (!refreshCookie) {
    throw new Error('注册响应没有下发刷新令牌 cookie');
  }

  return {
    accessToken: response.body.accessToken as string,
    refreshCookie: refreshCookie.split(';')[0]!,
    userId: response.body.user.id as string,
  };
}

export function futureIso(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

/** Socket.IO 需要真实监听的端口，supertest 直接打 handler 收不到 WebSocket */
export async function listenOnRandomPort(app: INestApplication): Promise<string> {
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('无法获取测试服务器端口');
  }
  return `http://127.0.0.1:${address.port}`;
}

/**
 * 直接建库用户并签一个 access token。
 * 审批/并发类测试需要一次造十几个用户，走注册接口会撞上 5 次/分钟 的限流。
 */
export async function createUserSession(
  app: INestApplication,
  nickname = '测试用户',
): Promise<TestSession> {
  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  const user = await prisma.user.create({
    data: {
      email: `direct-${randomUUID()}@test.local`,
      passwordHash: 'not-used-in-tests',
      nickname,
    },
  });

  const accessToken = await jwt.signAsync({ sub: user.id, jti: randomUUID() });

  return { accessToken, refreshCookie: '', userId: user.id };
}
