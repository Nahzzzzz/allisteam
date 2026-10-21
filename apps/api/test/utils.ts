import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppExceptionFilter } from '../src/common/filters/app-exception.filter';
import { requestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { RedisService } from '../src/common/redis/redis.service';
import { PrismaService } from '../src/prisma/prisma.service';

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

/**
 * 测试不连真实 Redis：限流、缓存、在线状态都是旁路依赖，
 * 连 Upstash 会让用例受网络抖动影响，还可能把限流键带到下一个用例。
 */
class InMemoryRedis {
  private readonly values = new Map<string, { value: string; expiresAt: number | null }>();

  clear(): void {
    this.values.clear();
  }

  private read(key: string): string | null {
    const entry = this.values.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    return entry.value;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    return this.read(key);
  }

  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.values.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.values.delete(key);
  }

  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const count = Number(this.read(key) ?? '0') + 1;
    this.values.set(key, { value: String(count), expiresAt: Date.now() + ttlSeconds * 1000 });
    return count;
  }

  async setNxPx(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (this.read(key) !== null) {
      return false;
    }
    this.values.set(key, { value, expiresAt: Date.now() + ttlMs });
    return true;
  }
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(RedisService)
    .useValue(new InMemoryRedis())
    .compile();
  const app = moduleRef.createNestApplication({
    logger: process.env.TEST_DEBUG ? ['error', 'warn'] : false,
  });
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new AppExceptionFilter());
  await app.init();
  return app;
}

export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$executeRaw`TRUNCATE "Review","Message","PostMember","Application","Post","GameInfo","ConcertInfo","TravelInfo","GameProfile","Game","RefreshToken","Block","Notification","Report","User" CASCADE`;

  // 每个用例重置限流计数与游戏字典缓存，避免用例之间互相污染
  const redis = app.get(RedisService) as unknown as { clear?: () => void };
  redis.clear?.();
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
