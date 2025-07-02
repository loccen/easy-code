/**
 * 单个项目API路由
 * GET /api/projects/[id] - 获取项目详情
 * PUT /api/projects/[id] - 更新项目
 * DELETE /api/projects/[id] - 删除项目
 */

import { NextRequest } from 'next/server';
import { withApiHandler, withAuth, withValidation } from '@/lib/api/middleware';
import { projectService } from '@/lib/services/project.service';
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';
import { z } from 'zod';

// 更新项目验证Schema
const UpdateProjectSchema = z.object({
  title: z.string().min(1, '项目标题不能为空').max(100, '项目标题不能超过100个字符').optional(),
  description: z.string().min(10, '项目描述至少需要10个字符').max(2000, '项目描述不能超过2000个字符').optional(),
  price: z.number().positive('项目价格必须大于0').optional(),
  category_id: z.string().uuid('分类ID格式不正确').optional(),
  tech_stack: z.array(z.string()).min(1, '至少选择一个技术栈').optional(),
  demo_url: z.string().url('演示地址格式不正确').optional().or(z.literal('')),
  github_url: z.string().url('GitHub地址格式不正确').optional().or(z.literal('')),
  documentation: z.string().max(5000, '文档内容不能超过5000个字符').optional(),
  features: z.array(z.string()).min(1, '至少添加一个功能特性').optional(),
  requirements: z.array(z.string()).min(1, '至少添加一个使用要求').optional(),
  file_url: z.string().url('文件地址格式不正确').optional(),
  thumbnail_url: z.string().url('缩略图地址格式不正确').optional(),
});

/**
 * GET /api/projects/[id]
 * 获取项目详情
 */
export const GET = withApiHandler(async (_req: NextRequest, context?: unknown) => {
  try {
    const projectId = (context as { params?: { id: string } })?.params?.id;
    
    if (!projectId) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID不能为空');
    }

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID格式不正确');
    }

    // 调用Service获取项目详情
    const result = await projectService.getProjectDetail(projectId);
    
    return result;
  } catch (error) {
    console.error('获取项目详情失败:', error);
    return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '获取项目详情失败');
  }
});

/**
 * PUT /api/projects/[id]
 * 更新项目（需要认证和项目所有权）
 */
export const PUT = withAuth(
  withValidation(UpdateProjectSchema)(
    async (_req: NextRequest, context?: unknown) => {
      try {
        const { params, user, body } = (context as { params?: { id: string }; user?: { id: string; role: string }; body?: unknown }) || {};
        const projectId = params?.id;
        
        if (!projectId) {
          return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID不能为空');
        }

        if (!user) {
          return ResponseWrapper.error(ErrorCode.UNAUTHORIZED, '请先登录');
        }

        // 验证UUID格式
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(projectId)) {
          return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID格式不正确');
        }

        // 调用Service更新项目
        const result = await projectService.updateProject(projectId, user.id, body);
        
        return result;
      } catch (error) {
        console.error('更新项目失败:', error);
        return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '更新项目失败');
      }
    }
  )
);

/**
 * DELETE /api/projects/[id]
 * 删除项目（需要认证和项目所有权或管理员权限）
 */
export const DELETE = withAuth(async (_req: NextRequest, context?: unknown) => {
  try {
    const { params, user } = (context as { params?: { id: string }; user?: { id: string; role: string } }) || {};
    const projectId = params?.id;
    
    if (!projectId) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID不能为空');
    }

    if (!user) {
      return ResponseWrapper.error(ErrorCode.UNAUTHORIZED, '请先登录');
    }

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目ID格式不正确');
    }

    // 管理员可以删除任何项目
    if (user.role === 'admin') {
      const result = await projectService.deleteProjectAsAdmin(projectId);
      return result;
    }

    // 普通用户只能删除自己的项目
    // 首先获取项目信息验证所有权
    const projectResult = await projectService.getProjectDetail(projectId);
    if (!projectResult.success || !projectResult.data) {
      return ResponseWrapper.error(ErrorCode.RESOURCE_NOT_FOUND, '项目不存在');
    }

    if (projectResult.data.seller_id !== user.id) {
      return ResponseWrapper.error(ErrorCode.PERMISSION_DENIED, '您没有权限删除此项目');
    }

    // 删除项目
    const result = await projectService.delete(projectId);
    return result;
  } catch (error) {
    console.error('删除项目失败:', error);
    return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '删除项目失败');
  }
});
