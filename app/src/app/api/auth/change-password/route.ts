/**
 * 修改密码API路由
 * POST /api/auth/change-password - 修改用户密码
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestBody, getAuthContext, handleApiError } from '@/lib/api/utils';
import { z } from 'zod';

// 修改密码请求验证Schema
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: z.string().min(6, '新密码至少需要6个字符'),
});

/**
 * POST /api/auth/change-password
 * 修改用户密码（需要认证）
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    // 解析请求体
    const body = await parseRequestBody(request);
    if (!body) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '请求体不能为空')
      );
    }

    // 验证请求数据
    const validation = ChangePasswordSchema.safeParse(body);
    if (!validation.success) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.VALIDATION_ERROR,
          '请求数据验证失败',
          validation.error.errors
        )
      );
    }

    const { currentPassword, newPassword } = validation.data;
    const supabase = createServerSupabaseClient();

    // 获取用户邮箱
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', authContext.user.id)
      .single();

    if (userError || !userData) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.USER_NOT_FOUND, '用户信息不存在')
      );
    }

    // 验证当前密码
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: currentPassword
    });

    if (signInError) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '当前密码不正确')
      );
    }

    // 更新密码
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('密码更新失败:', updateError);
      
      // 处理常见的Supabase Auth错误
      let errorMessage = '密码更新失败';
      const message = updateError.message.toLowerCase();
      
      if (message.includes('password')) {
        errorMessage = '新密码不符合要求，请确保密码至少6个字符';
      } else if (message.includes('rate limit')) {
        errorMessage = '操作过于频繁，请稍后再试';
      }
      
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, errorMessage)
      );
    }

    return createApiResponse(
      ResponseBuilder.success(null, '密码修改成功')
    );
  } catch (error) {
    console.error('修改密码失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
