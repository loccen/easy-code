/**
 * 分类详情管理API路由
 * PUT /api/categories/[id] - 更新分类
 * DELETE /api/categories/[id] - 删除分类
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestBody, getAuthContext, handleApiError } from '@/lib/api/utils';
import { z } from 'zod';

// 更新分类请求验证Schema
const UpdateCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(100, '分类名称不能超过100个字符').optional(),
  slug: z.string().min(1, '分类标识不能为空').max(100, '分类标识不能超过100个字符').optional(),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  icon: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

/**
 * PUT /api/categories/[id]
 * 更新分类（需要管理员权限）
 */
export async function PUT(
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
        ResponseBuilder.error(ErrorCode.FORBIDDEN, '只有管理员可以更新分类')
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
    const validation = UpdateCategorySchema.safeParse(body);
    if (!validation.success) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.VALIDATION_ERROR,
          '请求数据验证失败',
          validation.error.errors
        )
      );
    }

    const updateData = validation.data;
    const supabase = createServerSupabaseClient();

    // 检查分类是否存在
    const { data: existingCategory, error: existingError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (existingError || !existingCategory) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.NOT_FOUND, '分类不存在')
      );
    }

    // 如果更新了slug，检查是否与其他分类冲突
    if (updateData.slug && updateData.slug !== existingCategory.slug) {
      const { data: slugConflict, error: slugError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', categoryId)
        .single();

      if (slugError && slugError.code !== 'PGRST116') {
        throw slugError;
      }

      if (slugConflict) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.CONFLICT, '分类标识已存在')
        );
      }
    }

    // 如果指定了父分类，验证父分类是否存在且不是自己
    if (updateData.parent_id) {
      if (updateData.parent_id === categoryId) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '分类不能设置自己为父分类')
        );
      }

      const { data: parentCategory, error: parentError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', updateData.parent_id)
        .single();

      if (parentError || !parentCategory) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '指定的父分类不存在')
        );
      }
    }

    // 更新分类
    const { data, error } = await supabase
      .from('categories')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;

    return createApiResponse(
      ResponseBuilder.success(data, '分类更新成功')
    );
  } catch (error) {
    console.error('更新分类失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}

/**
 * DELETE /api/categories/[id]
 * 删除分类（需要管理员权限）
 */
export async function DELETE(
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
        ResponseBuilder.error(ErrorCode.FORBIDDEN, '只有管理员可以删除分类')
      );
    }

    const supabase = createServerSupabaseClient();

    // 检查分类是否存在
    const { data: existingCategory, error: existingError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (existingError || !existingCategory) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.NOT_FOUND, '分类不存在')
      );
    }

    // 检查是否有项目使用该分类
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, title')
      .eq('category_id', categoryId)
      .limit(1);

    if (projectError) throw projectError;

    if (projects && projects.length > 0) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.CONFLICT, 
          `无法删除分类，还有 ${projects.length} 个项目正在使用该分类`
        )
      );
    }

    // 检查是否有子分类
    const { data: subCategories, error: subError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('parent_id', categoryId)
      .limit(1);

    if (subError) throw subError;

    if (subCategories && subCategories.length > 0) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.CONFLICT, 
          `无法删除分类，还有 ${subCategories.length} 个子分类`
        )
      );
    }

    // 删除分类
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;

    return createApiResponse(
      ResponseBuilder.success(null, '分类删除成功')
    );
  } catch (error) {
    console.error('删除分类失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
