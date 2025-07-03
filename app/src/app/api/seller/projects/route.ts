/**
 * 卖家项目管理API路由
 * GET /api/seller/projects - 获取当前卖家的项目列表
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { 
  createApiResponse, 
  parseRequestParams, 
  getAuthContext,
  validatePaginationParams,
  handleApiError 
} from '@/lib/api/utils';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    if (!authContext.isSeller) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.FORBIDDEN, '只有卖家可以访问此接口')
      );
    }

    const params = parseRequestParams(request);
    const { page, limit, offset } = validatePaginationParams(params);
    const { sortBy = 'created_at', sortOrder = 'desc' } = params;

    const supabase = createServerSupabaseClient();

    // 构建查询
    const query = supabase
      .from('projects')
      .select(`
        *,
        category:categories(id, name, slug)
      `, { count: 'exact' })
      .eq('seller_id', authContext.user.id);

    // 排序和分页
    const { data, error, count } = await query
      .order(sortBy as string, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return createApiResponse(
      ResponseBuilder.paginated(data || [], count || 0, page, limit)
    );
  } catch (error) {
    console.error('获取卖家项目列表API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
