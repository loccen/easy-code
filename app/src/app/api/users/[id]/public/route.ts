/**
 * 获取用户公开信息API路由
 * GET /api/users/[id]/public
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, handleApiError } from '@/lib/api/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    if (!userId) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '用户ID不能为空')
      );
    }

    const supabase = createServerSupabaseClient();

    // 获取用户公开信息
    const { data, error } = await supabase
      .from('users')
      .select('id, username, created_at')
      .eq('id', userId)
      .eq('status', 'active') // 只返回活跃用户的信息
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.NOT_FOUND, '用户不存在')
        );
      }
      throw error;
    }

    // 获取用户头像（如果有）
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('user_id', userId)
      .single();

    return createApiResponse(
      ResponseBuilder.success({
        id: data.id,
        username: data.username,
        avatar_url: profileData?.avatar_url || null,
        created_at: data.created_at,
      })
    );
  } catch (error) {
    console.error('获取用户公开信息API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
