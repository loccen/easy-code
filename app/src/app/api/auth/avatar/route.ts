/**
 * 头像上传API路由
 * POST /api/auth/avatar
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, getAuthContext, handleApiError } from '@/lib/api/utils';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '请选择头像文件')
      );
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '只支持 JPEG、PNG、GIF、WebP 格式的图片')
      );
    }

    // 验证文件大小 (5MB)
    const maxFileSize = 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.VALIDATION_ERROR, '图片大小不能超过5MB')
      );
    }

    const supabase = createServerSupabaseClient();

    // 生成唯一文件名
    const fileExt = file.name.split('.').pop();
    const fileName = `${authContext.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // 上传到Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('头像上传失败:', uploadError);
      throw uploadError;
    }

    // 获取公共URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(filePath);

    // 更新用户资料中的头像URL
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: authContext.user.id,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (updateError) {
      console.error('更新头像URL失败:', updateError);
      throw updateError;
    }

    return createApiResponse(
      ResponseBuilder.success({ 
        avatar_url: publicUrl,
        message: '头像上传成功'
      })
    );
  } catch (error) {
    console.error('头像上传API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}

/**
 * DELETE /api/auth/avatar
 * 删除头像
 */
export async function DELETE(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext.isAuthenticated || !authContext.user) {
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.UNAUTHORIZED, '请先登录')
      );
    }

    const supabase = createServerSupabaseClient();

    // 获取当前头像URL
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('user_id', authContext.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('获取用户资料失败:', profileError);
      throw profileError;
    }

    const currentAvatarUrl = profileData?.avatar_url;

    // 更新用户资料，移除头像URL
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: authContext.user.id,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (updateError) {
      console.error('更新头像URL失败:', updateError);
      throw updateError;
    }

    // 删除存储中的头像文件（如果是上传的文件）
    if (currentAvatarUrl && currentAvatarUrl.includes('user-uploads/avatars/')) {
      const filePath = currentAvatarUrl.split('/').slice(-2).join('/');
      const { error: deleteError } = await supabase.storage
        .from('user-uploads')
        .remove([filePath]);

      if (deleteError) {
        console.error('删除头像文件失败:', deleteError);
        // 不抛出错误，因为数据库已经更新成功
      }
    }

    return createApiResponse(
      ResponseBuilder.success({
        message: '头像删除成功'
      })
    );
  } catch (error) {
    console.error('删除头像API错误:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
