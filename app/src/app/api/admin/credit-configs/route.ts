/**
 * 积分配置管理API路由
 * GET /api/admin/credit-configs - 获取积分配置
 * PUT /api/admin/credit-configs - 更新积分配置
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestBody, getAuthContext, handleApiError } from '@/lib/api/utils';
import { z } from 'zod';

// 更新积分配置请求验证Schema
const UpdateCreditConfigsSchema = z.object({
  configs: z.array(z.object({
    id: z.string().uuid(),
    config_key: z.string(),
    config_value: z.number().int().min(0),
  })).min(1, '至少需要更新一个配置项'),
});

/**
 * GET /api/admin/credit-configs
 * 获取积分配置（需要管理员权限）
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    if (!authContext.isAdmin) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.FORBIDDEN, '只有管理员可以访问积分配置')
      );
    }

    const supabase = createServerSupabaseClient();

    // 获取所有积分配置
    const { data, error } = await supabase
      .from('credit_configs')
      .select('*')
      .eq('is_active', true)
      .order('config_key');

    if (error) throw error;

    return createApiResponse(
      ResponseBuilder.success(data || [])
    );
  } catch (error) {
    console.error('获取积分配置失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}

/**
 * PUT /api/admin/credit-configs
 * 批量更新积分配置（需要管理员权限）
 */
export async function PUT(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    if (!authContext.isAdmin) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.FORBIDDEN, '只有管理员可以更新积分配置')
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
    const validation = UpdateCreditConfigsSchema.safeParse(body);
    if (!validation.success) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.VALIDATION_ERROR,
          '请求数据验证失败',
          validation.error.errors
        )
      );
    }

    const { configs } = validation.data;
    const supabase = createServerSupabaseClient();

    // 批量更新配置
    const updatePromises = configs.map(config => 
      supabase
        .from('credit_configs')
        .update({
          config_value: config.config_value,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id)
        .select()
        .single()
    );

    const results = await Promise.allSettled(updatePromises);
    
    // 检查是否有失败的更新
    const failedUpdates = results.filter(result => result.status === 'rejected');
    if (failedUpdates.length > 0) {
      console.error('部分配置更新失败:', failedUpdates);
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.INTERNAL_ERROR, '部分配置更新失败')
      );
    }

    // 获取更新后的所有配置
    const { data: updatedConfigs, error: fetchError } = await supabase
      .from('credit_configs')
      .select('*')
      .eq('is_active', true)
      .order('config_key');

    if (fetchError) throw fetchError;

    return createApiResponse(
      ResponseBuilder.success(updatedConfigs || [], '积分配置更新成功')
    );
  } catch (error) {
    console.error('更新积分配置失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
