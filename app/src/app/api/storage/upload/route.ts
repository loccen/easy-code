/**
 * 文件上传API路由
 * POST /api/storage/upload - 通用文件上传
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, getAuthContext, handleApiError } from '@/lib/api/utils';

/**
 * POST /api/storage/upload
 * 通用文件上传（需要认证）
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    // 解析FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const folder = formData.get('folder') as string;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '请选择要上传的文件')
      );
    }

    if (!bucket) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '存储桶参数不能为空')
      );
    }

    // 验证文件大小 (50MB)
    const maxFileSize = 50 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '文件大小不能超过50MB')
      );
    }

    // 验证文件类型
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/zip', 'application/x-zip-compressed',
      'application/pdf', 'text/plain', 'text/markdown',
      'application/json', 'application/javascript',
      'text/html', 'text/css'
    ];

    if (!allowedTypes.includes(file.type)) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '不支持的文件类型')
      );
    }

    const supabase = createServerSupabaseClient();

    // 生成文件路径
    let filePath: string;
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;

    if (bucket === 'project-files') {
      // 项目文件上传
      if (!projectId) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '项目ID不能为空')
        );
      }
      
      // 验证用户是否有权限上传到该项目
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
          ResponseBuilder.error(ErrorCode.FORBIDDEN, '无权限上传文件到该项目')
        );
      }

      filePath = `projects/${projectId}/${fileName}`;
    } else if (bucket === 'user-uploads') {
      // 用户文件上传
      const subfolder = folder || 'general';
      filePath = `${subfolder}/${authContext.user.id}-${fileName}`;
    } else {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '不支持的存储桶')
      );
    }

    // 上传文件到Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('文件上传失败:', uploadError);
      throw uploadError;
    }

    // 获取公共URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return createApiResponse(
      ResponseBuilder.success({
        url: publicUrl,
        path: filePath,
        bucket: bucket,
        size: file.size,
        type: file.type,
        name: file.name
      }, '文件上传成功')
    );
  } catch (error) {
    console.error('文件上传失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
