const clockFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
});

const dayFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });

/** 绝对时间：10/21 周三 00:14，用于评价时间、举报处理时间这类历史记录 */
export function formatStartTime(iso: string): string {
  const date = new Date(iso);
  return `${dayFormatter.format(date)} ${weekdayFormatter.format(date)} ${clockFormatter.format(date)}`;
}

/** 今天 / 明天 / 后天 / 具体日期，帮助用户快速判断紧急程度 */
export function relativeDayLabel(iso: string): string {
  const target = new Date(iso);
  const now = new Date();

  const startOfDay = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const diffDays = Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '明天';
  if (diffDays === 2) return '后天';
  return formatStartTime(iso);
}

/** 局的开始时间：三天内只说「今天 22:14」，更远的才展开成完整日期 */
export function formatPostTime(iso: string): string {
  const label = relativeDayLabel(iso);
  if (label === '今天' || label === '明天' || label === '后天') {
    return `${label} ${clockFormatter.format(new Date(iso))}`;
  }
  return label;
}

/** 聊天气泡上的时间：只显示时分 */
export function formatClock(iso: string): string {
  return clockFormatter.format(new Date(iso));
}

export interface TicketDateParts {
  /** 票面上的小格：三天内是「今天 / 明天 / 后天」，更远是「周五」 */
  top: string;
  /** 日：两位数字，票面日期块的主数字 */
  day: string;
  /** 月：8月 */
  month: string;
}

/** 卡片右侧的小票日期块：拆成「周几 / 日 / 月」三段，方便排版 */
export function ticketDateParts(iso: string): TicketDateParts {
  const date = new Date(iso);
  const label = relativeDayLabel(iso);
  const near = label === '今天' || label === '明天' || label === '后天';
  return {
    top: near ? label : weekdayFormatter.format(date),
    day: String(date.getDate()).padStart(2, '0'),
    month: `${date.getMonth() + 1}月`,
  };
}

/** datetime-local 的值按用户本地时区解释，提交前转成 UTC ISO */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
