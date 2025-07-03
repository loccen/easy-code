import { create } from 'zustand';
import { authService } from '@/lib/services/auth.service';
import { authTokenManager } from '@/lib/api/fetch-client';
import type { AuthUser } from '@/lib/auth';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),

  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    try {
      set({ loading: true });

      // 检查是否有保存的token
      const token = authTokenManager.getToken();

      if (token) {
        // 尝试获取当前用户信息
        const response = await authService.getCurrentUser();

        if (response.success && response.data) {
          set({ user: response.data, loading: false, initialized: true });
        } else {
          // token无效，清除并设置为未登录状态
          authTokenManager.setToken(null);
          set({ user: null, loading: false, initialized: true });
        }
      } else {
        // 没有token，设置为未登录状态
        set({ user: null, loading: false, initialized: true });
      }

    } catch (error) {
      console.error('初始化认证状态失败:', error);
      // 出错时清除token并设置为未登录状态
      authTokenManager.setToken(null);
      set({ user: null, loading: false, initialized: true });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });

      // 调用登出API
      await authService.logout();

      // 清除本地状态
      set({ user: null, loading: false });
    } catch (error) {
      console.error('登出失败:', error);

      // 即使API调用失败，也清除本地状态
      authTokenManager.setToken(null);
      set({ user: null, loading: false });

      throw error;
    }
  },

  refreshUser: async () => {
    try {
      const response = await authService.getCurrentUser();

      if (response.success && response.data) {
        set({ user: response.data });
      } else {
        // 如果获取用户信息失败，可能token已过期
        authTokenManager.setToken(null);
        set({ user: null });
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      // 出错时清除认证状态
      authTokenManager.setToken(null);
      set({ user: null });
    }
  },
}));

// 辅助函数
export const useAuth = () => {
  const { user, loading, initialized } = useAuthStore();
  
  return {
    user,
    loading,
    initialized,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSeller: user?.role === 'seller' || user?.role === 'admin',
    isBuyer: user?.role === 'buyer' || user?.role === 'admin',
  };
};
