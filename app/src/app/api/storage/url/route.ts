/**
 * 文件URL获取API路由
 * GET /api/storage/url - 获取文件公共URL
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, getAuthContext, handleApiError } from '@/lib/api/utils';

/**
 * GET /api/storage/url
 * 获取文件公共URL
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    const url = new URL(request.url);
    const bucket = url.searchParams.get('bucket');
    const path = url.searchParams.get('path');
    const projectId = url.searchParams.get('projectId');

    if (!bucket) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '存储桶参数不能为空')
      );
    }

    if (!path) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '文件路径不能为空')
      );
    }

    const supabase = createServerSupabaseClient();

    // 权限验证
    if (bucket === 'project-files') {
      // 项目文件访问权限验证
      if (!projectId) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '访问项目文件时需要提供项目ID')
        );
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('seller_id, status')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.NOT_FOUND, '项目不存在')
        );
      }

      // 只有项目所有者、管理员或已发布的项目可以访问
      const canAccess = 
        project.seller_id === authContext.user.id ||
        authContext.isAdmin ||
        project.status === 'approved';

      if (!canAccess) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.FORBIDDEN, '无权限访问该项目文件')
        );
      }
    } else if (bucket === 'user-uploads') {
      // 用户文件访问权限验证（头像等公开文件可以访问）
      // 对于用户上传的文件，一般都是公开的，这里不做严格限制
    } else {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '不支持的存储桶')
      );
    }

    // 获取公共URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return createApiResponse(
      ResponseBuilder.success({
        url: publicUrl,
        bucket: bucket,
        path: path
      })
    );
  } catch (error) {
    console.error('获取文件URL失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
