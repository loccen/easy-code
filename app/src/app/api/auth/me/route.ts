/**
 * 获取当前用户信息API路由
 * GET /api/auth/me
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, getAuthContext, handleApiError } from '@/lib/api/utils';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    const supabase = createServerSupabaseClient();

    // 获取用户详细信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authContext.user.id)
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

    // 获取用户资料
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authContext.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('获取用户资料失败:', profileError);
    }

    return createApiResponse(
      ResponseBuilder.success({
        ...userData,
        profile: profileData || undefined,
      })
    );
  } catch (error) {
    console.error('获取用户信息API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
