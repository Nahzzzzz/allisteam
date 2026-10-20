import { describe, expect, it } from 'vitest';
import { AppException } from '../app-exception';
import { decodeCursor, encodeCursor } from './cursor';

describe('cursor', () => {
  it('能编码并原样解码', () => {
    const value = { t: '2026-10-20T12:00:00.000Z', id: 'clx123' };
    expect(decodeCursor(encodeCursor(value))).toEqual(value);
  });

  it('生成的游标可安全放进 URL', () => {
    const encoded = encodeCursor({ t: '2026-10-20T12:00:00.000Z', id: 'a/b+c=' });
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('非法游标抛 VALIDATION_FAILED', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrowError(AppException);
  });

  it('字段缺失或时间格式错误时抛错', () => {
    const bad = Buffer.from(JSON.stringify({ t: 'yesterday', id: 'x' })).toString('base64url');
    expect(() => decodeCursor(bad)).toThrowError(AppException);
  });
});
