import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** 云数据库冷启动、网络抖动都会让首次 $connect 抛 P1001，重试几次比直接让进程起不来更划算。 */
const CONNECT_MAX_ATTEMPTS = 5;
const CONNECT_BASE_DELAY_MS = 1000;

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { errorCode?: string }).errorCode;
    const firstLine = error.message.split('\n')[0]?.trim() ?? error.name;
    return code ? `${code}: ${firstLine}` : firstLine;
  }
  return String(error);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    for (let attempt = 1; attempt <= CONNECT_MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.$connect();
        this.logger.log(attempt === 1 ? '数据库连接成功' : `数据库连接成功（第 ${attempt} 次尝试）`);
        return;
      } catch (error) {
        if (attempt === CONNECT_MAX_ATTEMPTS) {
          this.logger.error(`数据库连接失败，已重试 ${CONNECT_MAX_ATTEMPTS} 次：${describeError(error)}`);
          throw error;
        }
        const delayMs = CONNECT_BASE_DELAY_MS * 2 ** (attempt - 1);
        this.logger.warn(
          `数据库连接失败（第 ${attempt}/${CONNECT_MAX_ATTEMPTS} 次），${delayMs}ms 后重试：${describeError(error)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
