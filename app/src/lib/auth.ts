import { supabase } from './supabase';
import type { User, UserProfile } from '@/types';

export interface AuthUser extends User {
  profile?: UserProfile;
}

/**
 * 用户注册
 */
export async function signUp(email: string, password: string, username: string) {
  try {
    // 1. 使用Supabase Auth注册
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error('注册失败：未返回用户信息');
    }

    // 2. 创建用户记录
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        username,
        email_verified: false,
      });

    if (userError) throw userError;

    // 3. 创建用户详情记录
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        language: 'zh-CN',
      });

    if (profileError) throw profileError;

    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error('注册错误:', error);
    throw error;
  }
}

/**
 * 用户登录
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('登录错误:', error);
    throw error;
  }
}

/**
 * 用户登出
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('登出错误:', error);
    throw error;
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // 获取用户详细信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    // 获取用户资料
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return {
      ...userData,
      profile: profileData || undefined,
    };
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return null;
  }
}

/**
 * 重置密码
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
  } catch (error) {
    console.error('重置密码错误:', error);
    throw error;
  }
}

/**
 * 更新密码
 */
export async function updatePassword(password: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) throw error;
  } catch (error) {
    console.error('更新密码错误:', error);
    throw error;
  }
}

/**
 * 检查用户名是否可用
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (error && error.code === 'PGRST116') {
      // 没有找到记录，用户名可用
      return true;
    }

    if (error) throw error;

    // 找到记录，用户名不可用
    return false;
  } catch (error) {
    console.error('检查用户名错误:', error);
    return false;
  }
}
