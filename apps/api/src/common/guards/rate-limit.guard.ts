import { Injectable, Logger, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException } from '../app-exception';
import { RedisService } from '../redis/redis.service';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const identity = options.scope === 'user' ? request.user?.id : request.ip;
    if (!identity) {
      return true;
    }

    const key = `rl:${options.name}:${identity}`;

    try {
      const count = await this.redis.incrWithTtl(key, options.windowSeconds);
      if (count > options.limit) {
        throw new AppException('RATE_LIMITED', 429, '操作过于频繁，请稍后再试');
      }
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      // Redis 不可用时不阻塞业务，只记录告警
      this.logger.warn(`限流降级：${(error as Error).message}`);
    }

    return true;
  }
}
