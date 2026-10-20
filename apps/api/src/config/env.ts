import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('30m'),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(14),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  ADMIN_EMAILS: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** 在 ConfigModule 加载完 .env 之后调用，失败时直接抛出可读的配置错误 */
export function loadEnv(): Env {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`环境变量配置有误 → ${detail}`);
  }

  cached = parsed.data;
  return cached;
}

export function adminEmails(env: Env): string[] {
  return env.ADMIN_EMAILS.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
