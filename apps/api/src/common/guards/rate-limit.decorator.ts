import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  /** 计数命名空间，同一路由的不同策略要区分 */
  name: string;
  /** 窗口内允许的次数 */
  limit: number;
  /** 窗口长度（秒） */
  windowSeconds: number;
  /** 按用户还是按 IP 计数，默认按 IP */
  scope?: 'ip' | 'user';
}

export const RATE_LIMIT_KEY = 'rate_limit';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
