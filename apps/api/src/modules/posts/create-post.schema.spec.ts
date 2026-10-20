import { describe, expect, it } from 'vitest';
import { createPostSchema } from '@allisteam/shared';

const base = {
  domain: 'GAME' as const,
  title: '今晚八点排位缺一',
  description: '能开麦，心态好。',
  startTime: new Date(Date.now() + 3_600_000).toISOString(),
  capacity: 5,
  game: { gameId: 'game_1', platform: 'PC' as const },
};

describe('createPostSchema 边界', () => {
  it('标题 8–40 字有效，7/41 字无效', () => {
    expect(createPostSchema.safeParse({ ...base, title: '排'.repeat(8) }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...base, title: '排'.repeat(40) }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...base, title: '排'.repeat(7) }).success).toBe(false);
    expect(createPostSchema.safeParse({ ...base, title: '排'.repeat(41) }).success).toBe(false);
  });

  it('名额 2–20 有效，1/21 无效', () => {
    expect(createPostSchema.safeParse({ ...base, capacity: 2 }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...base, capacity: 20 }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...base, capacity: 1 }).success).toBe(false);
    expect(createPostSchema.safeParse({ ...base, capacity: 21 }).success).toBe(false);
  });

  it('拒绝未知字段（strict）', () => {
    const result = createPostSchema.safeParse({ ...base, authorId: 'forged' });
    expect(result.success).toBe(false);
  });

  it('只接受 GAME 分支', () => {
    const result = createPostSchema.safeParse({ ...base, domain: 'CONCERT' });
    expect(result.success).toBe(false);
  });
});
