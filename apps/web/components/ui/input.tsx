import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none',
        'placeholder:text-neutral-400 focus:border-neutral-900',
        className,
      )}
      {...props}
    />
  );
}
