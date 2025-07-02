/**
 * 项目API路由
 * GET /api/projects - 获取项目列表
 * POST /api/projects - 创建项目
 */

import { NextRequest } from 'next/server';
import { withApiHandler, withAuth, withValidation } from '@/lib/api/middleware';
import { projectService } from '@/lib/services/project.service';
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';
import { z } from 'zod';

// 创建项目验证Schema
const CreateProjectSchema = z.object({
  title: z.string().min(1, '项目标题不能为空').max(100, '项目标题不能超过100个字符'),
  description: z.string().min(10, '项目描述至少需要10个字符').max(2000, '项目描述不能超过2000个字符'),
  price: z.number().positive('项目价格必须大于0'),
  category_id: z.string().uuid('分类ID格式不正确'),
  tech_stack: z.array(z.string()).min(1, '至少选择一个技术栈'),
  demo_url: z.string().url('演示地址格式不正确').optional().or(z.literal('')),
  github_url: z.string().url('GitHub地址格式不正确').optional().or(z.literal('')),
  documentation: z.string().max(5000, '文档内容不能超过5000个字符').optional(),
  features: z.array(z.string()).min(1, '至少添加一个功能特性'),
  requirements: z.array(z.string()).min(1, '至少添加一个使用要求'),
  file_url: z.string().url('文件地址格式不正确').optional(),
  thumbnail_url: z.string().url('缩略图地址格式不正确').optional(),
});

// 项目查询参数Schema
const ProjectQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional(),
  category_id: z.string().uuid().optional(),
  seller_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  featured: z.string().transform(val => val === 'true').optional(),
  min_price: z.string().transform(val => parseFloat(val) || 0).optional(),
  max_price: z.string().transform(val => parseFloat(val) || Infinity).optional(),
  tech_stack: z.string().transform(val => val.split(',')).optional(),
  search: z.string().optional(),
  sort: z.enum(['created_at', 'price', 'rating_average', 'download_count', 'view_count']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

/**
 * GET /api/projects
 * 获取项目列表
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // 验证查询参数
    const validatedParams = ProjectQuerySchema.parse(queryParams);
    
    // 构建查询参数
    const projectQueryParams = {
      page: validatedParams.page,
      limit: validatedParams.limit,
      search: validatedParams.search,
      sortBy: validatedParams.sort,
      sortOrder: validatedParams.order,
      filters: {
        category_id: validatedParams.category_id,
        seller_id: validatedParams.seller_id,
        status: validatedParams.status,
        featured: validatedParams.featured,
        min_price: validatedParams.min_price,
        max_price: validatedParams.max_price,
        tech_stack: validatedParams.tech_stack,
      },
    };

    // 调用Service获取项目列表
    const result = await projectService.getPublishedProjects(projectQueryParams);
    
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseWrapper.error(
        ErrorCode.VALIDATION_ERROR,
        '查询参数验证失败',
        error.errors
      );
    }
    
    console.error('获取项目列表失败:', error);
    return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '获取项目列表失败');
  }
});

/**
 * POST /api/projects
 * 创建项目（需要认证和卖家权限）
 */
export const POST = withAuth(
  withValidation(CreateProjectSchema)(
    async (_req: NextRequest, context?: unknown) => {
      try {
        const { user, body } = (context as { user?: { id: string; role: string }; body?: unknown }) || {};
        
        if (!user) {
          return ResponseWrapper.error(ErrorCode.UNAUTHORIZED, '请先登录');
        }

        // 检查用户权限（只有卖家和管理员可以创建项目）
        if (!['seller', 'admin'].includes(user.role)) {
          return ResponseWrapper.error(
            ErrorCode.PERMISSION_DENIED, 
            '只有卖家和管理员可以创建项目'
          );
        }

        // 调用Service创建项目
        const result = await projectService.createProject(user.id, body);
        
        return result;
      } catch (error) {
        console.error('创建项目失败:', error);
        return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '创建项目失败');
      }
    }
  )
);
