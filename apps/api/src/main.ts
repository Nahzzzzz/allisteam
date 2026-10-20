import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { PinoLoggerService } from './common/logger/pino-logger.service';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { RedisIoAdapter } from './common/ws/redis-io.adapter';
import { EnvService } from './config/env.service';

async function bootstrap(): Promise<void> {
  // 显式传入 HTTP 适配器：npm workspaces 会把 @nestjs/platform-express 装在 apps/api 下，
  // 而 @nestjs/core 被提升到根目录，动态 loadPackage 找不到它
  const app = await NestFactory.create(AppModule, new ExpressAdapter(), { bufferLogs: true });
  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  const env = app.get(EnvService).values;

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.use(helmet());
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.useGlobalFilters(new AppExceptionFilter());
  app.enableShutdownHooks();

  // 多实例广播依赖 Redis；连不上时退化为单实例，不阻塞启动
  const wsAdapter = new RedisIoAdapter(app, env.WEB_ORIGIN, env.REDIS_URL);
  const sharedAdapter = await wsAdapter.connect();
  app.useWebSocketAdapter(wsAdapter);
  if (sharedAdapter) {
    logger.log('WebSocket 已启用 Redis adapter', 'Bootstrap');
  } else {
    logger.warn('Redis 不可用，WebSocket 以单实例模式运行', 'Bootstrap');
  }

  await app.listen(env.PORT);
}

bootstrap().catch((error: unknown) => {
  // 启动失败必须让进程退出，否则容器会一直挂在半初始化状态
  console.error('API 启动失败', error);
  process.exitCode = 1;
});
