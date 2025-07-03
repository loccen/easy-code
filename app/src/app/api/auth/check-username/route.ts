/**
 * 检查用户名是否可用API路由
 * GET /api/auth/check-username?username=xxx
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestParams, handleApiError } from '@/lib/api/utils';

export async function GET(request: NextRequest) {
  try {
    const params = parseRequestParams(request);
    const { username } = params;

    if (!username || typeof username !== 'string') {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '用户名参数不能为空')
      );
    }

    if (username.length < 2 || username.length > 50) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '用户名长度必须在2-50个字符之间')
      );
    }

    const supabase = createServerSupabaseClient();

    // 检查用户名是否已存在
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const available = !data; // 如果没有找到数据，说明用户名可用

    return createApiResponse(
      ResponseBuilder.success({ available })
    );
  } catch (error) {
    console.error('检查用户名API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
