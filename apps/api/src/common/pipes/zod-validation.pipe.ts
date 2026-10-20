import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { AppException } from '../app-exception';

/** 把 zod schema 接到 body / query / param 上，校验失败统一抛 VALIDATION_FAILED */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppException(
        'VALIDATION_FAILED',
        400,
        '参数校验失败',
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }
    return result.data;
  }
}
