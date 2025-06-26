import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, signOut as authSignOut } from '@/lib/auth';
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

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    try {
      set({ loading: true });

      // 获取当前会话
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 获取完整用户信息
        const user = await getCurrentUser();
        set({ user, loading: false, initialized: true });
      } else {
        set({ user: null, loading: false, initialized: true });
      }

      // 监听认证状态变化
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const user = await getCurrentUser();
          set({ user, loading: false });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, loading: false });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const user = await getCurrentUser();
          set({ user, loading: false });
        }
      });

    } catch (error) {
      console.error('初始化认证状态失败:', error);
      set({ user: null, loading: false, initialized: true });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      await authSignOut();
      set({ user: null, loading: false });
    } catch (error) {
      console.error('登出失败:', error);
      set({ loading: false });
      throw error;
    }
  },

  refreshUser: async () => {
    try {
      const user = await getCurrentUser();
      set({ user });
    } catch (error) {
      console.error('刷新用户信息失败:', error);
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
