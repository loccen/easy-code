/**
 * 卖家单个项目管理API路由
 * GET /api/seller/projects/[id] - 获取单个项目详情
 * PUT /api/seller/projects/[id] - 更新项目
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestBody, getAuthContext, handleApiError } from '@/lib/api/utils';
import { z } from 'zod';

// 更新项目请求验证Schema
const UpdateProjectSchema = z.object({
  title: z.string().min(1, '项目标题不能为空').max(200, '项目标题不能超过200个字符').optional(),
  description: z.string().min(10, '项目描述至少需要10个字符').optional(),
  category_id: z.string().uuid('分类ID格式不正确').optional(),
  price: z.number().min(0, '价格不能为负数').optional(),
  demo_url: z.string().url('演示地址格式不正确').optional().nullable(),
  github_url: z.string().url('GitHub地址格式不正确').optional().nullable(),
  documentation_url: z.string().url('文档地址格式不正确').optional().nullable(),
  is_dockerized: z.boolean().optional(),
  file_urls: z.array(z.string().url()).optional().nullable(),
});

/**
 * GET /api/seller/projects/[id]
 * 获取单个项目详情（需要卖家权限）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
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

    const supabase = createServerSupabaseClient();

    // 获取项目详情，确保只能获取自己的项目
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .eq('id', projectId)
      .eq('seller_id', authContext.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.NOT_FOUND, '项目不存在或您没有权限访问')
        );
      }
      throw error;
    }

    return createApiResponse(
      ResponseBuilder.success(data)
    );
  } catch (error) {
    console.error('获取项目详情失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}

/**
 * PUT /api/seller/projects/[id]
 * 更新项目（需要卖家权限）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    if (!authContext.isSeller) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.FORBIDDEN, '只有卖家可以更新项目')
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
    const validation = UpdateProjectSchema.safeParse(body);
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

    // 检查项目是否存在且属于当前用户
    const { data: existingProject, error: existingError } = await supabase
      .from('projects')
      .select('id, seller_id')
      .eq('id', projectId)
      .eq('seller_id', authContext.user.id)
      .single();

    if (existingError || !existingProject) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.NOT_FOUND, '项目不存在或您没有权限修改')
      );
    }

    // 如果指定了分类，验证分类是否存在
    if (updateData.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', updateData.category_id)
        .eq('is_active', true)
        .single();

      if (categoryError || !category) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '指定的分类不存在或已禁用')
        );
      }
    }

    // 更新项目
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .single();

    if (error) throw error;

    return createApiResponse(
      ResponseBuilder.success(data, '项目更新成功')
    );
  } catch (error) {
    console.error('更新项目失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
