import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold leading-5 whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'border border-line/70 bg-surface-2 text-ink-muted',
        // 主标识：信号橙
        solid: 'metal-fill text-accent-ink shadow-card',
        outline: 'border border-line-strong/70 text-ink-muted',
        accent: 'border border-accent/30 bg-accent/10 text-accent',
        success: 'border border-lime/30 bg-lime/10 text-lime',
        warning: 'border border-warning/30 bg-warning/10 text-warning',
        danger: 'border border-danger/30 bg-danger/10 text-danger',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
