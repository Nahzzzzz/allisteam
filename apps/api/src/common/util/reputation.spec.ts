import { describe, expect, it } from 'vitest';
import { nextTrustScore, penalizeTrustScore } from './reputation';

describe('nextTrustScore', () => {
  it('按 0.6 旧分 + 0.4 × 星级 × 20 计算并四舍五入', () => {
    // 0.6 * 60 + 0.4 * 5 * 20 = 36 + 40 = 76
    expect(nextTrustScore(60, 5)).toBe(76);
    // 0.6 * 60 + 0.4 * 3 * 20 = 36 + 24 = 60
    expect(nextTrustScore(60, 3)).toBe(60);
    // 0.6 * 60 + 0.4 * 1 * 20 = 36 + 8 = 44
    expect(nextTrustScore(60, 1)).toBe(44);
  });

  it('把结果收敛到 0–100', () => {
    expect(nextTrustScore(100, 5)).toBe(100);
    expect(nextTrustScore(0, 1)).toBe(8);
    expect(nextTrustScore(0, 0)).toBe(8);
  });

  it('越界的旧分与星级按区间收敛', () => {
    expect(nextTrustScore(130, 5)).toBe(100);
    expect(nextTrustScore(-20, 5)).toBe(40);
    expect(nextTrustScore(60, 9)).toBe(76);
  });
});

describe('penalizeTrustScore', () => {
  it('举报成立扣 10 分', () => {
    expect(penalizeTrustScore(60)).toBe(50);
    expect(penalizeTrustScore(5)).toBe(0);
  });

  it('最低 0 分，不出现负数', () => {
    expect(penalizeTrustScore(0)).toBe(0);
  });
});
