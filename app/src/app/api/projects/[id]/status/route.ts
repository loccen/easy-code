/**
 * 项目状态管理API路由
 * PUT /api/projects/[id]/status - 更新项目状态（管理员专用）
 */

import { NextRequest } from 'next/server';
import { withAuth, withValidation } from '@/lib/api/middleware';
import { projectService } from '@/lib/services/project.service';
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';
import { z } from 'zod';

// 更新项目状态验证Schema
const UpdateProjectStatusSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    required_error: '状态不能为空',
    invalid_type_error: '状态必须是 approved 或 rejected'
  }),
  rejection_reason: z.string().max(500, '拒绝原因不能超过500个字符').optional(),
});

/**
 * PUT /api/projects/[id]/status
 * 更新项目状态（仅管理员）
 */
export const PUT = withAuth(
  withValidation(UpdateProjectStatusSchema)(
    async (_req: NextRequest, context?: unknown) => {
      try {
        const { params, user, body } = (context as { params?: { id: string }; user?: { id: string; role: string }; body?: { status: string; rejection_reason?: string } }) || {};
        const projectId = params?.id;
        
        if (!projectId) {
          return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID不能为空');
        }

        if (!user) {
          return ResponseWrapper.error(ErrorCode.UNAUTHORIZED, '请先登录');
        }

        // 检查管理员权限
        if (user.role !== 'admin') {
          return ResponseWrapper.error(
            ErrorCode.PERMISSION_DENIED, 
            '只有管理员可以审核项目'
          );
        }

        // 验证UUID格式
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(projectId)) {
          return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID格式不正确');
        }

        const { status, rejection_reason } = body;

        // 如果是拒绝状态，必须提供拒绝原因
        if (status === 'rejected' && (!rejection_reason || rejection_reason.trim().length === 0)) {
          return ResponseWrapper.error(
            ErrorCode.VALIDATION_ERROR, 
            '拒绝项目时必须提供拒绝原因',
            null,
            'rejection_reason'
          );
        }

        // 调用Service审核项目
        const result = await projectService.reviewProject(projectId, status, rejection_reason);
        
        return result;
      } catch (error) {
        console.error('更新项目状态失败:', error);
        return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '更新项目状态失败');
      }
    }
  )
);
