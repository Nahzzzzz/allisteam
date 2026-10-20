'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { refreshSession } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

/** 刷新页面后 access token 丢失，用 httpOnly 里的刷新令牌静默恢复会话 */
export function SessionBootstrap() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hydrated) {
      return;
    }
    void refreshSession().finally(() => {
      const state = useAuthStore.getState();
      state.markHydrated();
      if (state.accessToken) {
        // 恢复登录态前发出的匿名请求（局详情里的 isAuthor、我的报名状态等）已经混进缓存，
        // 这里统一失效重拉一次，避免页面停留在未登录视角
        void queryClient.invalidateQueries();
      }
    });
  }, [hydrated, queryClient]);

  return null;
}
