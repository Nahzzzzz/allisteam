import type { PostStatus } from '@allisteam/shared';

/**
 * 每个游戏 / 用户从 8 个色调里取一个固定色，靠名字哈希，不依赖数据库 id。
 * class 必须写成完整字符串，Tailwind 才能扫描到。
 *
 * 三种用法，按信息量从重到轻：
 * - fill：实心色块 + 黑字，票面日期块、游戏标签用这个
 * - chip / avatar：浅底描边，次要标签
 * - dot / edge / soft：细线、小圆点、光晕
 */
export interface Tone {
  text: string;
  chip: string;
  avatar: string;
  fill: string;
  dot: string;
  edge: string;
  soft: string;
}

const TONES: Tone[] = [
  {
    text: 'text-tone-1',
    chip: 'border-tone-1/35 bg-tone-1/10 text-tone-1',
    avatar: 'border-tone-1/40 bg-tone-1/12 text-tone-1',
    fill: 'bg-tone-1 text-canvas',
    dot: 'bg-tone-1',
    edge: 'border-t-tone-1',
    soft: 'bg-tone-1/10',
  },
  {
    text: 'text-tone-2',
    chip: 'border-tone-2/35 bg-tone-2/10 text-tone-2',
    avatar: 'border-tone-2/40 bg-tone-2/12 text-tone-2',
    fill: 'bg-tone-2 text-canvas',
    dot: 'bg-tone-2',
    edge: 'border-t-tone-2',
    soft: 'bg-tone-2/10',
  },
  {
    text: 'text-tone-3',
    chip: 'border-tone-3/35 bg-tone-3/10 text-tone-3',
    avatar: 'border-tone-3/40 bg-tone-3/12 text-tone-3',
    fill: 'bg-tone-3 text-canvas',
    dot: 'bg-tone-3',
    edge: 'border-t-tone-3',
    soft: 'bg-tone-3/10',
  },
  {
    text: 'text-tone-4',
    chip: 'border-tone-4/35 bg-tone-4/10 text-tone-4',
    avatar: 'border-tone-4/40 bg-tone-4/12 text-tone-4',
    fill: 'bg-tone-4 text-canvas',
    dot: 'bg-tone-4',
    edge: 'border-t-tone-4',
    soft: 'bg-tone-4/10',
  },
  {
    text: 'text-tone-5',
    chip: 'border-tone-5/35 bg-tone-5/10 text-tone-5',
    avatar: 'border-tone-5/40 bg-tone-5/12 text-tone-5',
    fill: 'bg-tone-5 text-canvas',
    dot: 'bg-tone-5',
    edge: 'border-t-tone-5',
    soft: 'bg-tone-5/10',
  },
  {
    text: 'text-tone-6',
    chip: 'border-tone-6/35 bg-tone-6/10 text-tone-6',
    avatar: 'border-tone-6/40 bg-tone-6/12 text-tone-6',
    fill: 'bg-tone-6 text-canvas',
    dot: 'bg-tone-6',
    edge: 'border-t-tone-6',
    soft: 'bg-tone-6/10',
  },
  {
    text: 'text-tone-7',
    chip: 'border-tone-7/35 bg-tone-7/10 text-tone-7',
    avatar: 'border-tone-7/40 bg-tone-7/12 text-tone-7',
    fill: 'bg-tone-7 text-canvas',
    dot: 'bg-tone-7',
    edge: 'border-t-tone-7',
    soft: 'bg-tone-7/10',
  },
  {
    text: 'text-tone-8',
    chip: 'border-tone-8/35 bg-tone-8/10 text-tone-8',
    avatar: 'border-tone-8/40 bg-tone-8/12 text-tone-8',
    fill: 'bg-tone-8 text-canvas',
    dot: 'bg-tone-8',
    edge: 'border-t-tone-8',
    soft: 'bg-tone-8/10',
  },
];

/** 稳定的字符串哈希：同一昵称 / 游戏名永远同色 */
function hash(seed: string): number {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) % 100_000;
  }
  return value;
}

export function toneOf(seed: string): Tone {
  return TONES[hash(seed) % TONES.length]!;
}

/** 状态色：招募中=绿，满员=琥珀，结束=紫，取消=红 */
export function statusTone(status: PostStatus | string): string {
  switch (status) {
    case 'OPEN':
      return 'border-lime/30 bg-lime/10 text-lime';
    case 'FULL':
      return 'border-amber/30 bg-amber/10 text-amber';
    case 'CLOSED':
      return 'border-violet/30 bg-violet/10 text-violet';
    case 'CANCELLED':
      return 'border-danger/30 bg-danger/10 text-danger';
    default:
      return 'border-line/70 bg-surface-2 text-ink-muted';
  }
}
