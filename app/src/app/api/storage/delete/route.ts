/**
 * 文件删除API路由
 * DELETE /api/storage/delete - 删除文件
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, parseRequestBody, getAuthContext, handleApiError } from '@/lib/api/utils';
import { z } from 'zod';

// 删除文件请求验证Schema
const DeleteFileSchema = z.object({
  bucket: z.string().min(1, '存储桶不能为空'),
  path: z.string().min(1, '文件路径不能为空'),
  projectId: z.string().uuid().optional(), // 项目文件删除时需要
});

/**
 * DELETE /api/storage/delete
 * 删除文件（需要认证和权限验证）
 */
export async function DELETE(request: NextRequest) {
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
    const validation = DeleteFileSchema.safeParse(body);
    if (!validation.success) {
      return createApiResponse(
        ResponseBuilder.error(
          ErrorCode.VALIDATION_ERROR,
          '请求数据验证失败',
          validation.error.errors
        )
      );
    }

    const { bucket, path, projectId } = validation.data;
    const supabase = createServerSupabaseClient();

    // 权限验证
    if (bucket === 'project-files') {
      // 项目文件删除权限验证
      if (!projectId) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '删除项目文件时需要提供项目ID')
        );
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('seller_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.NOT_FOUND, '项目不存在')
        );
      }

      if (project.seller_id !== authContext.user.id && !authContext.isAdmin) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.FORBIDDEN, '无权限删除该项目的文件')
        );
      }
    } else if (bucket === 'user-uploads') {
      // 用户文件删除权限验证
      // 检查文件路径是否属于当前用户
      if (!path.includes(authContext.user.id) && !authContext.isAdmin) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.FORBIDDEN, '无权限删除该文件')
        );
      }
    } else {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '不支持的存储桶')
      );
    }

    // 删除文件
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (deleteError) {
      console.error('文件删除失败:', deleteError);
      throw deleteError;
    }

    return createApiResponse(
      ResponseBuilder.success('文件删除成功')
    );
  } catch (error) {
    console.error('文件删除失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
