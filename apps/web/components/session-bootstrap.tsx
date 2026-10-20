'use client';

import { useEffect } from 'react';
import { refreshSession } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

/** 刷新页面后 access token 丢失，用 httpOnly 里的刷新令牌静默恢复会话 */
export function SessionBootstrap() {
  const hydrated = useAuthStore((state) => state.hydrated);

  useEffect(() => {
    if (hydrated) {
      return;
    }
    void refreshSession().finally(() => {
      useAuthStore.getState().markHydrated();
    });
  }, [hydrated]);

  return null;
}
