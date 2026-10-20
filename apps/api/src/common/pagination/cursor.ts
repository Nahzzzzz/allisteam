import { z } from 'zod';
import { AppException } from '../app-exception';

const cursorSchema = z.object({
  t: z.iso.datetime(),
  id: z.string().min(1),
});

export interface CursorValue {
  /** 排序时间的 ISO 字符串 */
  t: string;
  /** 次级排序字段，保证游标稳定 */
  id: string;
}

export function encodeCursor(value: CursorValue): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): CursorValue {
  try {
    const json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    return cursorSchema.parse(json);
  } catch {
    throw new AppException('VALIDATION_FAILED', 400, '游标无效', [
      { path: 'cursor', message: '游标格式不正确' },
    ]);
  }
}
