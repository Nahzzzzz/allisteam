import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check(): Promise<{ status: 'ok' | 'degraded'; db: 'ok' | 'down'; redis: 'ok' | 'down' }> {
    const db = await this.checkDb();
    const redis = await this.checkRedis();
    return {
      status: db === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      db,
      redis,
    };
  }

  private async checkDb(): Promise<'ok' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'ok' | 'down'> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'ok' : 'down';
    } catch {
      return 'down';
    }
  }
}
