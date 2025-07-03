/**
 * 分类状态切换API路由
 * PATCH /api/categories/[id]/toggle - 切换分类启用/禁用状态
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, getAuthContext, handleApiError } from '@/lib/api/utils';

/**
 * PATCH /api/categories/[id]/toggle
 * 切换分类启用/禁用状态（需要管理员权限）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    if (!authContext.isAdmin) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.FORBIDDEN, '只有管理员可以切换分类状态')
      );
    }

    const supabase = createServerSupabaseClient();

    // 检查分类是否存在
    const { data: existingCategory, error: existingError } = await supabase
      .from('categories')
      .select('id, name, is_active')
      .eq('id', categoryId)
      .single();

    if (existingError || !existingCategory) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.NOT_FOUND, '分类不存在')
      );
    }

    // 切换状态
    const newStatus = !existingCategory.is_active;
    
    const { data, error } = await supabase
      .from('categories')
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;

    const statusText = newStatus ? '启用' : '禁用';
    
    return createApiResponse(
      ResponseBuilder.success(data, `分类已${statusText}`)
    );
  } catch (error) {
    console.error('切换分类状态失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
