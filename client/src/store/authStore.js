import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  (set) => ({
    user: null,
    token: null,
    refreshToken: null,
    preferences: { theme: 'system' },
    setAuth: ({ user, accessToken, refreshToken }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, token: accessToken, refreshToken, preferences: user?.preferences || { theme: 'system' } });
    },
    updateUser: (user) => set(s => ({ user: { ...s.user, ...user }, preferences: user.preferences || s.preferences })),
    clearAuth: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, token: null, refreshToken: null });
    },
  }),
  { name: 'auth-store', partialize: s => ({ user: s.user, token: s.token, refreshToken: s.refreshToken, preferences: s.preferences }) }
));
