import cookieParser from 'cookie-parser';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
