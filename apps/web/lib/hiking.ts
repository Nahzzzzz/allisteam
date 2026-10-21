import type { HikingDifficulty } from '@allisteam/shared';

/**
 * 徒步难度的配色：轻松=绿、进阶=琥珀、硬核=玫红。
 * 和局的状态色区分开，避免在旅行页里两种含义撞色。
 */
export const HIKING_DIFFICULTY_TONE: Record<HikingDifficulty, string> = {
  EASY: 'border-lime/35 bg-lime/12 text-lime',
  MODERATE: 'border-amber/35 bg-amber/12 text-amber',
  HARD: 'border-rose/35 bg-rose/12 text-rose',
};

export const HIKING_DIFFICULTY_DOT: Record<HikingDifficulty, string> = {
  EASY: 'bg-lime',
  MODERATE: 'bg-amber',
  HARD: 'bg-rose',
};
