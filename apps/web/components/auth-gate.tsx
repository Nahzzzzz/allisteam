'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/** 登录态页面在客户端渲染：access token 只在内存，刷新后由 SessionBootstrap 恢复 */
export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  if (!hydrated) {
    return <p className="px-4 py-16 text-center text-sm text-neutral-500">加载中…</p>;
  }

  if (!user) {
    return (
      <div className="px-4 py-16 text-center text-sm text-neutral-500">
        <p>请先登录</p>
        <p className="mt-3">
          <Link href="/login" className="font-medium text-neutral-900 underline">
            去登录
          </Link>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
