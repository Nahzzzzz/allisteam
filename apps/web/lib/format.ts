const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatStartTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** 今天 / 明天 / 具体日期，帮助用户快速判断紧急程度 */
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

const clockFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
});

/** 聊天气泡上的时间：只显示时分 */
export function formatClock(iso: string): string {
  return clockFormatter.format(new Date(iso));
}

/** datetime-local 的值按用户本地时区解释，提交前转成 UTC ISO */export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
