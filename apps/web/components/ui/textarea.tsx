import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm outline-none',
        'placeholder:text-neutral-400 focus:border-neutral-900',
        className,
      )}
      {...props}
    />
  );
}
