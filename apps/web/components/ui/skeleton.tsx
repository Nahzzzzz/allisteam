import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** 骨架块：loading 占位统一用它，别在各页面自己写 animate-pulse */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-xl bg-linear-to-r from-surface-2 via-surface-3 to-surface-2 bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  );
}
