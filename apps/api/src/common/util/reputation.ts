/** PRD §8.4：初始 60，区间 0–100 */
export const TRUST_SCORE_INITIAL = 60;
export const TRUST_SCORE_MIN = 0;
export const TRUST_SCORE_MAX = 100;

/** 举报成立（管理员判定）固定扣分 */
export const REPORT_PENALTY = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

/**
 * PRD §8.4：`newScore = clamp(round(0.6 × 旧分 + 0.4 × rating × 20), 0, 100)`。
 * 越界输入按区间收敛，保证库里永远不会出现 0 以下或 100 以上。
 */
export function nextTrustScore(current: number, rating: number): number {
  const base = clamp(toInteger(current, TRUST_SCORE_INITIAL), TRUST_SCORE_MIN, TRUST_SCORE_MAX);
  const stars = clamp(toInteger(rating, 1), 1, 5);
  return clamp(Math.round(0.6 * base + 0.4 * stars * 20), TRUST_SCORE_MIN, TRUST_SCORE_MAX);
}

/** 举报成立扣 10 分，最低 0 分且不恢复 */
export function penalizeTrustScore(current: number, points: number = REPORT_PENALTY): number {
  const base = clamp(toInteger(current, TRUST_SCORE_INITIAL), TRUST_SCORE_MIN, TRUST_SCORE_MAX);
  return clamp(base - Math.max(0, toInteger(points, REPORT_PENALTY)), TRUST_SCORE_MIN, TRUST_SCORE_MAX);
}
