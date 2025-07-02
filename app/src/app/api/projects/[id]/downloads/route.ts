/**
 * 项目下载量API路由
 * POST /api/projects/[id]/downloads - 增加项目下载量
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import { projectService } from '@/lib/services/project.service';
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';

/**
 * POST /api/projects/[id]/downloads
 * 增加项目下载量（需要认证）
 */
export const POST = withAuth(async (_req: NextRequest, context?: any) => {
  try {
    const projectId = context?.params?.id;

    if (!projectId) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID不能为空');
    }

    if (!context?.user) {
      return ResponseWrapper.error(ErrorCode.UNAUTHORIZED, '请先登录');
    }

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID格式不正确');
    }

    // TODO: 这里应该验证用户是否有下载权限（已购买或者是项目所有者）
    // 暂时先允许所有登录用户下载，后续在文件下载管理模块中完善权限控制

    // 调用Service增加下载量
    const result = await projectService.incrementDownloads(projectId);

    return result;
  } catch (error) {
    console.error('增加项目下载量失败:', error);
    return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '增加项目下载量失败');
  }
});
