import { describe, expect, it } from 'vitest';
import { ttlToSeconds } from './ttl';

describe('ttlToSeconds', () => {
  it('解析带单位的值', () => {
    expect(ttlToSeconds('30m')).toBe(1800);
    expect(ttlToSeconds('2h')).toBe(7200);
    expect(ttlToSeconds('14d')).toBe(1_209_600);
  });

  it('纯数字按秒处理', () => {
    expect(ttlToSeconds('90')).toBe(90);
  });

  it('无法解析时抛错', () => {
    expect(() => ttlToSeconds('半小时')).toThrowError();
  });
});
