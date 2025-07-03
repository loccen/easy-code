/**
 * 用户注册API路由
 * POST /api/auth/register
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestBody, handleApiError } from '@/lib/api/utils';
import { z } from 'zod';

// 注册请求验证Schema
const RegisterSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少需要6个字符'),
  username: z.string().min(2, '用户名至少需要2个字符').max(50, '用户名不能超过50个字符'),
});

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await parseRequestBody<{
      email: string;
      password: string;
      username: string;
    }>(request);

    if (!body) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '请求体不能为空')
      );
    }

    // 验证请求数据
    const validation = RegisterSchema.safeParse(body);
    if (!validation.success) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.VALIDATION_ERROR,
          '请求数据验证失败',
          validation.error.errors
        )
      );
    }

    const { email, password, username } = validation.data;
    const supabase = createServerSupabaseClient();

    // 检查邮箱是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.CONFLICT, '邮箱已被使用')
      );
    }

    // 检查用户名是否已存在
    const { data: existingUsername, error: usernameError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (usernameError && usernameError.code !== 'PGRST116') {
      throw usernameError;
    }

    if (existingUsername) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.CONFLICT, '用户名已被使用')
      );
    }

    // 使用Supabase Auth注册
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.VALIDATION_ERROR,
          authError.message || '注册失败'
        )
      );
    }

    if (!authData.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.SERVER_ERROR, '注册失败：未返回用户信息')
      );
    }

    // 创建用户记录
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        username,
        email_verified: false,
        role: 'buyer',
        status: 'active',
      });

    if (userError) {
      // 如果用户记录创建失败，需要清理Auth用户
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw userError;
    }

    // 创建用户详情记录
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        language: 'zh-CN',
      });

    if (profileError) {
      console.error('创建用户详情失败:', profileError);
      // 不抛出错误，允许没有详情的情况
    }

    // 发放注册奖励积分（异步执行，不阻塞注册流程）
    try {
      const { grantRegistrationBonus } = await import('@/lib/credits');
      await grantRegistrationBonus(authData.user.id);
    } catch (error) {
      console.error('发放注册奖励失败:', error);
      // 不抛出错误，不影响注册流程
    }

    return createApiResponse(
      ResponseBuilder.success({
        user: {
          id: authData.user.id,
          email,
          username,
          role: 'buyer',
        },
        session: authData.session,
      })
    );
  } catch (error) {
    console.error('注册API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
