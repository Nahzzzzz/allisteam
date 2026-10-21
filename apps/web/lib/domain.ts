import type { Domain, PostSummary } from '@allisteam/shared';

/**
 * 三个领域在票面上的「分色印刷」：游戏=信号橙，演唱会=紫，旅行=青。
 * 颜色只从 globals.css 的 @theme 取，不在组件里写死。
 */
export interface DomainMeta {
  label: string;
  /** 票面小字里的英文代号 */
  code: string;
  /** 副券上的用途说明 */
  caption: string;
  /** 选中 / 主标识的实心块 */
  solid: string;
  /** 只上色不填充的文字 */
  text: string;
  /** 列表里的浅底描边标签 */
  chip: string;
  /** 卡片左侧竖条 */
  bar: string;
  /** 首页票头的说明文案 */
  intro: string;
  /** 发布表单顶部的引导 */
  publishHint: string;
}

export const DOMAIN_META: Record<Domain, DomainMeta> = {
  GAME: {
    label: '游戏',
    code: 'GAME',
    caption: '排位 · 开黑 · 上分',
    solid: 'bg-accent text-accent-ink',
    text: 'text-accent',
    chip: 'border-accent/45 bg-accent/12 text-accent',
    bar: 'bg-accent',
    intro: '同一时间、同一款游戏，找几个玩得来的人一起开一局。',
    publishHint: '写清游戏、平台和时间，别人一眼就能判断合不合适。',
  },
  CONCERT: {
    label: '演唱会',
    code: 'CONCERT',
    caption: '同场次 · 同区域 · 一起散场',
    solid: 'bg-tone-5 text-canvas',
    text: 'text-tone-5',
    chip: 'border-tone-5/45 bg-tone-5/12 text-tone-5',
    bar: 'bg-tone-5',
    intro: '同一场演出，找同一区域的人一起排队入场、一起散场回家。',
    publishHint: '写清艺人、场次和座位区域；这里只找同行的人，不涉及任何票务转售。',
  },
  TRAVEL: {
    label: '旅行',
    code: 'TRAVEL',
    caption: '同目的地 · 同日期 · 分摊预算',
    solid: 'bg-tone-3 text-canvas',
    text: 'text-tone-3',
    chip: 'border-tone-3/45 bg-tone-3/12 text-tone-3',
    bar: 'bg-tone-3',
    intro: '同一段假期、同一个目的地，找消费习惯接近的人一起走。',
    publishHint: '写清目的地、日期和预算；预算透明，才容易找到节奏一致的人。',
  },
};

export const DOMAIN_ORDER: Domain[] = ['GAME', 'CONCERT', 'TRAVEL'];

/** URL 上的 domain 参数不可信，非法值一律回落到游戏 */
export function domainOf(value: string | undefined | null): Domain {
  if (value === 'CONCERT' || value === 'TRAVEL') {
    return value;
  }
  return 'GAME';
}

/** 列表 / 卡片上的主标签：游戏局看游戏，演唱会看艺人，旅游看目的地 */
export function postPrimary(post: Pick<PostSummary, 'game' | 'concert' | 'travel'>): string {
  return post.game?.name ?? post.concert?.artist ?? post.travel?.destination ?? '这个局';
}
