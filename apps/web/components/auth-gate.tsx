'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/auth-store';

/** 登录态页面在客户端渲染：access token 只在内存，刷新后由 SessionBootstrap 恢复 */
export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  if (!hydrated) {
    return (
      <div className="space-y-3 px-4 py-8">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="请先登录"
        description="登录后才能查看和管理自己的局。"
        action={
          <Link href="/login" className={buttonVariants({ size: 'md' })}>
            去登录
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}
