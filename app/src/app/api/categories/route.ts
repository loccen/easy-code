/**
 * 分类管理API路由
 * GET /api/categories - 获取所有分类
 * POST /api/categories - 创建分类
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestBody, getAuthContext, handleApiError } from '@/lib/api/utils';
import { z } from 'zod';

// 创建分类请求验证Schema
const CreateCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(100, '分类名称不能超过100个字符'),
  slug: z.string().min(1, '分类标识不能为空').max(100, '分类标识不能超过100个字符'),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  icon: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

/**
 * GET /api/categories
 * 获取所有分类（支持层级查询）
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('include_inactive') === 'true';
    const authContext = await getAuthContext(request);

    const supabase = createServerSupabaseClient();

    // 构建查询
    let query = supabase
      .from('categories')
      .select(`
        *,
        parent:categories!parent_id(name)
      `)
      .order('sort_order');

    // 如果不是管理员，只返回活跃分类
    if (!authContext.isAdmin && !includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return createApiResponse(
      ResponseBuilder.success(data || [])
    );
  } catch (error) {
    console.error('获取分类列表失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}

/**
 * POST /api/categories
 * 创建新分类（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    if (!authContext.isAdmin) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.FORBIDDEN, '只有管理员可以创建分类')
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
    const validation = CreateCategorySchema.safeParse(body);
    if (!validation.success) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.VALIDATION_ERROR,
          '请求数据验证失败',
          validation.error.errors
        )
      );
    }

    const categoryData = validation.data;
    const supabase = createServerSupabaseClient();

    // 检查分类标识是否已存在
    const { data: existingSlug, error: slugError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categoryData.slug)
      .single();

    if (slugError && slugError.code !== 'PGRST116') {
      throw slugError;
    }

    if (existingSlug) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.CONFLICT, '分类标识已存在')
      );
    }

    // 如果指定了父分类，验证父分类是否存在
    if (categoryData.parent_id) {
      const { data: parentCategory, error: parentError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', categoryData.parent_id)
        .single();

      if (parentError || !parentCategory) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '指定的父分类不存在')
        );
      }
    }

    // 创建分类
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description || null,
        parent_id: categoryData.parent_id || null,
        icon: categoryData.icon || null,
        sort_order: categoryData.sort_order,
        is_active: categoryData.is_active,
      })
      .select()
      .single();

    if (error) throw error;

    return createApiResponse(
      ResponseBuilder.success(data, '分类创建成功')
    );
  } catch (error) {
    console.error('创建分类失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
