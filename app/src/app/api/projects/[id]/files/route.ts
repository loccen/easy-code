/**
 * 项目文件上传API路由
 * POST /api/projects/[id]/files
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, getAuthContext, handleApiError } from '@/lib/api/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    if (!authContext.isSeller) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.FORBIDDEN, '只有卖家可以上传文件')
      );
    }

    const projectId = params.id;
    if (!projectId) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '项目ID不能为空')
      );
    }

    const supabase = createServerSupabaseClient();

    // 验证项目是否存在且属于当前用户
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, seller_id')
      .eq('id', projectId)
      .eq('seller_id', authContext.user.id)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.NOT_FOUND, '项目不存在或无权限访问')
        );
      }
      throw projectError;
    }

    // 解析表单数据
    const formData = await request.formData();
    const files: File[] = [];

    // 收集所有文件
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '请选择要上传的文件')
      );
    }

    // 验证文件大小和类型
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-tar',
      'application/gzip'
    ];

    for (const file of files) {
      if (file.size > maxFileSize) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, `文件 ${file.name} 大小超过100MB限制`)
        );
      }

      if (!allowedTypes.includes(file.type)) {
        return createApiResponse(
          ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, `文件 ${file.name} 类型不支持，请上传压缩文件`)
        );
      }
    }

    // 上传文件到Supabase Storage
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileName = `${projectId}/${Date.now()}-${file.name}`;
      const filePath = `projects/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('文件上传失败:', uploadError);
        throw new Error(`文件 ${file.name} 上传失败: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    // 更新项目记录，保存文件URL
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        file_urls: uploadedUrls,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('保存文件URL失败:', updateError);
      throw updateError;
    }

    return createApiResponse(
      ResponseBuilder.success({ 
        file_urls: uploadedUrls,
        message: `成功上传 ${files.length} 个文件`
      })
    );
  } catch (error) {
    console.error('项目文件上传API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
