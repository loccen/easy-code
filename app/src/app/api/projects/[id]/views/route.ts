/**
 * 项目浏览量API路由
 * POST /api/projects/[id]/views - 增加项目浏览量
 */

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/middleware';
import { projectService } from '@/lib/services/project.service';
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';

/**
 * POST /api/projects/[id]/views
 * 增加项目浏览量
 */
export const POST = withApiHandler(async (req: NextRequest, context?: { params?: { id: string } }) => {
  try {
    const projectId = context?.params?.id;
    
    if (!projectId) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID不能为空');
    }

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID格式不正确');
    }

    // 调用Service增加浏览量
    const result = await projectService.incrementViews(projectId);
    
    return result;
  } catch (error) {
    console.error('增加项目浏览量失败:', error);
    return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '增加项目浏览量失败');
  }
});
