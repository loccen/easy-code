/**
 * 删除账户API路由
 * DELETE /api/auth/delete-account - 删除用户账户
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseBuilder, ErrorCode } from '@/lib/api/types';
import { createApiResponse, getAuthContext, handleApiError } from '@/lib/api/utils';

/**
 * DELETE /api/auth/delete-account
 * 删除用户账户（需要认证）
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

    // 使用软删除函数，该函数会同时删除 auth.users 记录
    const { error: rpcError } = await supabase.rpc('soft_delete_user_account');

    if (rpcError) {
      console.error('删除账户失败:', rpcError);
      
      // 处理常见错误
      let errorMessage = '删除账户失败';
      const message = rpcError.message?.toLowerCase() || '';
      
      if (message.includes('permission') || message.includes('access')) {
        errorMessage = '权限不足，无法删除账户';
      } else if (message.includes('not found')) {
        errorMessage = '账户不存在';
      } else if (message.includes('constraint') || message.includes('reference')) {
        errorMessage = '账户存在关联数据，无法删除';
      }
      
      return createApiResponse(
        ResponseBuilder.error(ErrorCode.INTERNAL_ERROR, errorMessage)
      );
    }

    // 删除成功后，清理认证状态
    await supabase.auth.signOut();

    return createApiResponse(
      ResponseBuilder.success(null, '账户删除成功')
    );
  } catch (error) {
    console.error('删除账户失败:', error);
    const errorResponse = handleApiError(error);
    return createApiResponse(errorResponse);
  }
}
