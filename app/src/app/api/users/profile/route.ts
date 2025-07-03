/**
 * 用户资料管理API路由
 * GET /api/users/profile - 获取当前用户资料
 * PUT /api/users/profile - 更新用户资料
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestBody, getAuthContext, handleApiError } from '@/lib/api/utils';
import { z } from 'zod';

// 更新用户资料请求验证Schema
const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, '姓名不能为空').max(100, '姓名不能超过100个字符').optional(),
  bio: z.string().max(500, '个人简介不能超过500个字符').optional().nullable(),
  location: z.string().max(100, '所在地不能超过100个字符').optional().nullable(),
  website: z.string().url('网站地址格式不正确').optional().nullable(),
  github_username: z.string().max(50, 'GitHub用户名不能超过50个字符').optional().nullable(),
  twitter_username: z.string().max(50, 'Twitter用户名不能超过50个字符').optional().nullable(),
  linkedin_url: z.string().url('LinkedIn地址格式不正确').optional().nullable(),
});

/**
 * GET /api/users/profile
 * 获取当前用户资料
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    const supabase = createServerSupabaseClient();

    // 获取用户资料
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authContext.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // 如果没有资料记录，返回空对象
    const profileData = data || {
      user_id: authContext.user.id,
      full_name: null,
      bio: null,
      location: null,
      website: null,
      github_username: null,
      twitter_username: null,
      linkedin_url: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return createApiResponse(
      ResponseBuilder.success(profileData)
    );
  } catch (error) {
    console.error('获取用户资料失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}

/**
 * PUT /api/users/profile
 * 更新用户资料
 */
export async function PUT(request: NextRequest) {
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
    const validation = UpdateProfileSchema.safeParse(body);
    if (!validation.success) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.VALIDATION_ERROR,
          '请求数据验证失败',
          validation.error.errors
        )
      );
    }

    const profileData = validation.data;
    const supabase = createServerSupabaseClient();

    // 准备更新数据
    const updateData = {
      user_id: authContext.user.id,
      ...profileData,
      updated_at: new Date().toISOString(),
    };

    // 使用upsert更新或创建用户资料
    const { error } = await supabase
      .from('user_profiles')
      .upsert(updateData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) throw error;

    return createApiResponse(
      ResponseBuilder.success('用户资料更新成功')
    );
  } catch (error) {
    console.error('更新用户资料失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
