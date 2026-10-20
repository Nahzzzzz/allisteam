import { HttpException } from '@nestjs/common';
import type { ErrorCode } from '@allisteam/shared';

/**
 * 业务异常：所有可预期的失败都用它抛出，由 AppExceptionFilter 统一序列化为
 * { code, message, details, requestId }。
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}
