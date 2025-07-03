/**
 * 用户登出API路由
 * POST /api/auth/logout
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder } from '@/lib/api/types';
import { createApiResponse, handleApiError } from '@/lib/api/utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 从请求头获取Authorization token
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // 设置token并登出
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: '', // 登出时不需要refresh token
      });
    }

    // 执行登出
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('登出失败:', error);
      // 即使登出失败，也返回成功，因为客户端可以清除本地状态
    }

    return createApiResponse(
      ResponseBuilder.success({ message: '登出成功' })
    );
  } catch (error) {
    console.error('登出API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
