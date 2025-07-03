/**
 * 用户登录API路由
 * POST /api/auth/login
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestBody, handleApiError } from '@/lib/api/utils';
import { z } from 'zod';

// 登录请求验证Schema
const LoginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await parseRequestBody<{
      email: string;
      password: string;
    }>(request);

    if (!body) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '请求体不能为空')
      );
    }

    // 验证请求数据
    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.VALIDATION_ERROR,
          '请求数据验证失败',
          validation.error.errors
        )
      );
    }

    const { email, password } = validation.data;
    const supabase = createServerSupabaseClient();

    // 使用Supabase Auth登录
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 转换Supabase错误为用户友好的中文提示
      let errorMessage = '登录失败';
      const message = error.message.toLowerCase();

      if (message.includes('invalid login credentials') ||
          message.includes('invalid credentials') ||
          message.includes('email not confirmed')) {
        errorMessage = '邮箱或密码错误，请检查后重试';
      } else if (message.includes('email not found') ||
                 message.includes('user not found')) {
        errorMessage = '该邮箱尚未注册';
      } else if (message.includes('too many requests')) {
        errorMessage = '登录尝试过于频繁，请稍后再试';
      } else if (message.includes('network') ||
                 message.includes('connection')) {
        errorMessage = '网络连接异常，请检查网络后重试';
      }

      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, errorMessage)
      );
    }

    if (!data.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.SERVER_ERROR, '登录失败：未返回用户信息')
      );
    }

    // 获取用户详细信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error('获取用户详细信息失败:', userError);
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.USER_NOT_FOUND, '用户信息不存在')
      );
    }

    // 检查用户状态
    if (userData.status === 'deleted') {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '账户已被删除')
      );
    }

    if (userData.status === 'suspended') {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '账户已被暂停')
      );
    }

    // 获取用户资料
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('获取用户资料失败:', profileError);
    }

    return createApiResponse(
      ResponseBuilder.success({
        user: {
          ...userData,
          profile: profileData || undefined,
        },
        session: data.session,
      })
    );
  } catch (error) {
    console.error('登录API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
