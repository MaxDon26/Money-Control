import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User, LoginData, RegisterData, UpdateUserData } from '@/shared/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: UpdateUserData) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (data: LoginData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(data);
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          set({ user: response.user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          const message = (error as { response?: { data?: { message?: string } } })
            ?.response?.data?.message || 'Ошибка входа';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          set({ user: response.user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          const message = (error as { response?: { data?: { message?: string } } })
            ?.response?.data?.message || 'Ошибка регистрации';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
        } catch {
          // Игнорируем ошибки logout
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, isAuthenticated: false });
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateProfile: async (data: UpdateUserData) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authApi.updateMe(data);
          set({ user, isLoading: false });
        } catch (error: unknown) {
          const message = (error as { response?: { data?: { message?: string } } })
            ?.response?.data?.message || 'Ошибка обновления профиля';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
