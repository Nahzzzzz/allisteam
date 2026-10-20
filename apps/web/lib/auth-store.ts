import { create } from 'zustand';

export interface SessionUser {
  id: string;
  nickname: string;
  email: string;
}

interface AuthState {
  accessToken: string | null;
  user: SessionUser | null;
  hydrated: boolean;
  setSession: (session: { accessToken: string; user: SessionUser }) => void;
  updateUser: (user: SessionUser) => void;
  clear: () => void;
  markHydrated: () => void;
}

/** access token 只放内存，刷新页面后靠 httpOnly cookie 重新换取 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  hydrated: false,
  setSession: ({ accessToken, user }) => set({ accessToken, user, hydrated: true }),
  updateUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null, hydrated: true }),
  markHydrated: () => set({ hydrated: true }),
}));
