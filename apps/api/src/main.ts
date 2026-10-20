import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { PinoLoggerService } from './common/logger/pino-logger.service';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { EnvService } from './config/env.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLoggerService));

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

  await app.listen(env.PORT);
}

bootstrap().catch((error: unknown) => {
  // 启动失败必须让进程退出，否则容器会一直挂在半初始化状态
  console.error('API 启动失败', error);
  process.exitCode = 1;
});
