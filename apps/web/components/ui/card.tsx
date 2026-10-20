import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** 深色下大阴影几乎无效，层级靠描边 + 顶部极浅高光区分 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'metal-sheen rounded-[12px] border border-line bg-surface p-4 shadow-card',
        className,
      )}
      {...props}
    />
  );
}
