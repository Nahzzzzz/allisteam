import { describe, expect, it } from 'vitest';
import { createPostSchema } from '@allisteam/shared';

const startTime = new Date(Date.now() + 3_600_000).toISOString();
const endTime = new Date(Date.now() + 3 * 86_400_000).toISOString();

const gameBase = {
  domain: 'GAME' as const,
  title: '今晚八点排位缺一',
  description: '能开麦，心态好。',
  startTime,
  capacity: 5,
  game: { gameId: 'game_1', platform: 'PC' as const },
};

const concertBase = {
  domain: 'CONCERT' as const,
  title: '周六上海场找同行',
  description: '内场看台都行，散场一起回酒店。',
  startTime,
  capacity: 4,
  concert: { artist: '陈粒', seatType: 'INNER' as const, hasTicket: true },
};

const travelBase = {
  domain: 'TRAVEL' as const,
  title: '国庆大理五天找搭子',
  description: '节奏慢一点，主要想环洱海和喝咖啡。',
  startTime,
  endTime,
  capacity: 4,
  travel: { destination: '大理', budgetMin: 2000, budgetMax: 4000 },
};

describe('createPostSchema 边界', () => {
  it('标题 8–40 字有效，7/41 字无效', () => {
    expect(createPostSchema.safeParse({ ...gameBase, title: '排'.repeat(8) }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...gameBase, title: '排'.repeat(40) }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...gameBase, title: '排'.repeat(7) }).success).toBe(false);
    expect(createPostSchema.safeParse({ ...gameBase, title: '排'.repeat(41) }).success).toBe(false);
  });

  it('名额 2–20 有效，1/21 无效', () => {
    expect(createPostSchema.safeParse({ ...gameBase, capacity: 2 }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...gameBase, capacity: 20 }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...gameBase, capacity: 1 }).success).toBe(false);
    expect(createPostSchema.safeParse({ ...gameBase, capacity: 21 }).success).toBe(false);
  });

  it('拒绝未知字段（strict）', () => {
    for (const base of [gameBase, concertBase, travelBase]) {
      expect(createPostSchema.safeParse({ ...base, authorId: 'forged' }).success).toBe(false);
    }
  });

  it('三个领域分支都能通过', () => {
    expect(createPostSchema.safeParse(gameBase).success).toBe(true);
    expect(createPostSchema.safeParse(concertBase).success).toBe(true);
    expect(createPostSchema.safeParse(travelBase).success).toBe(true);
  });

  it('演唱会不能带 game 载荷，游戏局不能带 concert 载荷', () => {
    expect(
      createPostSchema.safeParse({ ...concertBase, game: { gameId: 'x', platform: 'PC' } }).success,
    ).toBe(false);
    expect(createPostSchema.safeParse({ ...gameBase, concert: { artist: '陈粒' } }).success).toBe(
      false,
    );
  });

  it('演唱会艺人必填', () => {
    expect(
      createPostSchema.safeParse({ ...concertBase, concert: { artist: '  ' } }).success,
    ).toBe(false);
  });

  it('旅游局必须有返程日期', () => {
    expect(createPostSchema.safeParse({ ...travelBase, endTime: undefined }).success).toBe(false);
  });

  it('旅游预算上限不能低于下限', () => {
    const result = createPostSchema.safeParse({
      ...travelBase,
      travel: { destination: '大理', budgetMin: 5000, budgetMax: 3000 },
    });
    expect(result.success).toBe(false);
  });

  it('旅游目的地必填', () => {
    expect(
      createPostSchema.safeParse({ ...travelBase, travel: { destination: '' } }).success,
    ).toBe(false);
  });
});
