import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-11 w-full appearance-none rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-900',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
