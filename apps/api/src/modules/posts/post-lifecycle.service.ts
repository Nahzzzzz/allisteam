import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

/** PRD §8.1：开始时间 + 6 小时视为已结束 */
export const POST_CLOSE_AFTER_MS = 6 * 60 * 60 * 1000;

const CLOSE_INTERVAL_MS = 10 * 60 * 1000;

/** 锁的 TTL 略小于执行周期，实例挂掉后下一轮能自动接手 */
const LOCK_KEY = 'job:close-expired-posts';
const LOCK_TTL_MS = 9 * 60 * 1000;

/**
 * 把过期的局置为 CLOSED。
 * 评价资格依赖 CLOSED（或开始满 6 小时），所以这个任务是 M5 的前置条件。
 */
@Injectable()
export class PostLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostLifecycleService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    // 测试里由用例显式调用 closeExpiredPosts，避免后台任务与断言赛跑
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.timer = setInterval(() => {
      void this.closeExpiredPosts().catch((error: unknown) => {
        this.logger.error(`结束过期局失败：${(error as Error).message}`);
      });
    }, CLOSE_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** 返回本轮结束的局数量；多实例下靠 Redis SET NX PX 保证只有一台执行 */
  async closeExpiredPosts(now: Date = new Date()): Promise<number> {
    let locked = false;
    try {
      locked = await this.redis.setNxPx(LOCK_KEY, `${process.pid}:${now.getTime()}`, LOCK_TTL_MS);
      if (!locked) {
        return 0;
      }
    } catch (error) {
      // Redis 故障时降级为单实例执行，不能让过期局永远停在 OPEN
      this.logger.warn(`分布式锁不可用，本轮直接执行：${(error as Error).message}`);
    }

    try {
      const cutoff = new Date(now.getTime() - POST_CLOSE_AFTER_MS);
      const result = await this.prisma.post.updateMany({
        where: { status: { in: ['OPEN', 'FULL'] }, startTime: { lt: cutoff } },
        data: { status: 'CLOSED' },
      });
      if (result.count > 0) {
        this.logger.log(`已结束 ${result.count} 个过期局`);
      }
      return result.count;
    } finally {
      if (locked) {
        await this.redis.del(LOCK_KEY).catch(() => undefined);
      }
    }
  }
}
