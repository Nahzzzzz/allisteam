import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** 空态 / 错误态 / 无权访问，统一收口到这里，避免各页面写一行灰字了事 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-14 text-center', className)}>
      {icon ? (
        <div className="mb-3 flex size-12 rotate-[-4deg] items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent shadow-card">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1.5 text-xs text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
