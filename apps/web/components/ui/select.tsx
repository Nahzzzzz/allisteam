import type { SelectHTMLAttributes } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-11 w-full appearance-none rounded-[8px] border border-line bg-surface-2/70 pl-3 pr-9 text-sm text-ink shadow-input outline-none',
          'focus:border-accent/70 focus:bg-surface-2 focus:ring-2 focus:ring-accent/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
    </div>
  );
}
