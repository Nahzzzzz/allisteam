/** 业务错误码，与 Tech Design §7.3 保持一致；新增时同步该文档 */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'TOKEN_EXPIRED',
  'FORBIDDEN',
  'NOT_POST_MEMBER',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'ALREADY_APPLIED',
  'ALREADY_DECIDED',
  'ALREADY_REVIEWED',
  'POST_FULL',
  'POST_NOT_OPEN',
  'POST_NOT_ENDED',
  'REPORT_DUPLICATE',
  'GAME_PROFILE_EXISTS',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** 所有非 2xx 响应的统一结构 */
export interface AppErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
  requestId?: string;
}
