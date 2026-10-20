import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** 输入框的统一外观，PasswordInput 等需要额外包一层的组件复用它 */
export const inputClass = cn(
  'h-11 w-full rounded-[8px] border border-line bg-surface-2/70 px-3 text-sm text-ink shadow-input outline-none',
  'placeholder:text-ink-faint focus:border-accent/70 focus:bg-surface-2 focus:ring-2 focus:ring-accent/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
  // 校验失败时只加红边，不改变尺寸，避免表单跳动
  'aria-[invalid=true]:border-danger/70',
);

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}
