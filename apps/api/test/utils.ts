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
 * 闆嗘垚娴嬭瘯鍏变韩鍚屼竴涓?Redis锛屾敞鍐?鍙戝眬閮芥湁闄愭祦锛? * 姣忎釜鐢ㄤ緥鍓嶆竻鎺夐檺娴佽鏁板櫒锛岄伩鍏嶇敤渚嬩箣闂翠簰鐩?429銆? */
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
    .send({ email, password: 'abc12345', nickname: '娴嬭瘯鐢ㄦ埛' })
    .expect(201);

  const setCookie = response.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie].filter(Boolean);
  const refreshCookie = cookies.find((value: string) => value.startsWith('at_refresh='));
  if (!refreshCookie) {
    throw new Error('娉ㄥ唽鍝嶅簲娌℃湁涓嬪彂鍒锋柊浠ょ墝 cookie');
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

/** Socket.IO 闇€瑕佺湡瀹炵洃鍚殑绔彛锛宻upertest 鐩存帴鎵?handler 鏀朵笉鍒?WebSocket */
export async function listenOnRandomPort(app: INestApplication): Promise<string> {
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('鏃犳硶鑾峰彇娴嬭瘯鏈嶅姟鍣ㄧ鍙?);
  }
  return `http://127.0.0.1:${address.port}`;
}

/**
 * 鐩存帴寤哄簱鐢ㄦ埛骞剁涓€涓?access token銆? * 瀹℃壒/骞跺彂绫绘祴璇曢渶瑕佷竴娆￠€犲崄鍑犱釜鐢ㄦ埛锛岃蛋娉ㄥ唽鎺ュ彛浼氭挒涓?5 娆?鍒嗛挓 鐨勯檺娴併€? */
export async function createUserSession(
  app: INestApplication,
  nickname = '娴嬭瘯鐢ㄦ埛',
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
