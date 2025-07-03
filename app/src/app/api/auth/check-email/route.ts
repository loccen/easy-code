/**
 * 检查邮箱是否可用API路由
 * GET /api/auth/check-email?email=xxx
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestParams, handleApiError } from '@/lib/api/utils';

export async function GET(request: NextRequest) {
  try {
    const params = parseRequestParams(request);
    const { email } = params;

    if (!email || typeof email !== 'string') {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '邮箱参数不能为空')
      );
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '邮箱格式不正确')
      );
    }

    const supabase = createServerSupabaseClient();

    // 检查邮箱是否已存在
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const available = !data; // 如果没有找到数据，说明邮箱可用

    return createApiResponse(
      ResponseBuilder.success({ available })
    );
  } catch (error) {
    console.error('检查邮箱API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
