const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

/** 把 "30m" / "2h" / "14d" 解析成秒；纯数字按秒处理 */
export function ttlToSeconds(ttl: string): number {
  const trimmed = ttl.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const match = /^(\d+)([smhd])$/.exec(trimmed);
  if (!match) {
    throw new Error(`无法解析的有效期：${ttl}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof UNIT_SECONDS;
  return amount * UNIT_SECONDS[unit]!;
}
