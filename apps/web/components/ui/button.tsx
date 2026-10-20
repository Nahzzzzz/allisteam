import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  [
    'inline-flex select-none items-center justify-center gap-2 rounded-[8px] text-sm font-semibold',
    'transition-[background-color,border-color,color,box-shadow,filter] duration-150',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        // 主按钮 = 信号橙实心块，下沿一道硬边，像贴上去的印刷色块
        primary:
          'metal-fill text-accent-ink shadow-press hover:brightness-[1.06] active:brightness-95',
        secondary:
          'metal-sheen border border-line bg-surface-2 text-ink shadow-card hover:border-line-strong hover:bg-surface-3',
        ghost: 'text-ink-muted hover:bg-surface-2 hover:text-ink',
        danger: 'bg-danger text-canvas shadow-card hover:bg-danger/90',
      },
      size: {
        md: 'h-11 px-4',
        sm: 'h-9 px-3 text-xs',
        block: 'h-12 w-full px-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
