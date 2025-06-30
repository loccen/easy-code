import { supabase } from './supabase';
import { grantRegistrationBonus } from './credits';
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

    // 4. 发放注册奖励积分（异步执行，不阻塞注册流程）
    try {
      await grantRegistrationBonus(authData.user.id);
    } catch (error) {
      console.error('发放注册奖励失败:', error);
      // 不抛出错误，不影响注册流程
    }

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

    // 获取用户详细信息，不使用 .single() 避免 PGRST116 错误
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .limit(1);

    if (userError) {
      console.error('获取用户详细信息失败:', userError);
      throw userError;
    }

    // 如果没有找到用户记录，返回null
    if (!userData || userData.length === 0) {
      console.warn('用户记录不存在:', user.id);
      return null;
    }

    // 获取用户资料，不使用 .single()
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (profileError) {
      console.error('获取用户资料失败:', profileError);
      // 不抛出错误，允许没有资料的情况
    }

    return {
      ...userData[0],
      profile: (profileData && profileData.length > 0) ? profileData[0] : undefined,
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
    const { data, error } = await supabase.rpc('check_username_available', {
      username_to_check: username
    });

    if (error) {
      console.error('检查用户名错误:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('检查用户名错误:', error);
    throw error;
  }
}

/**
 * 检查邮箱是否可用
 */
export async function checkEmailAvailable(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_email_available', {
      email_to_check: email
    });

    if (error) {
      console.error('检查邮箱错误:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('检查邮箱错误:', error);
    throw error;
  }
}
