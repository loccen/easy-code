/**
 * 项目搜索API路由
 * GET /api/projects/search - 搜索项目
 */

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/middleware';
import { projectService } from '@/lib/services/project.service';
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';
import { z } from 'zod';

// 项目搜索参数Schema
const ProjectSearchSchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空').max(100, '搜索关键词不能超过100个字符'),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional(),
  category_id: z.string().uuid().optional(),
  min_price: z.string().transform(val => parseFloat(val) || 0).optional(),
  max_price: z.string().transform(val => parseFloat(val) || Infinity).optional(),
  tech_stack: z.string().transform(val => val.split(',')).optional(),
  sort: z.enum(['created_at', 'price', 'rating_average', 'download_count', 'view_count']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

/**
 * GET /api/projects/search
 * 搜索项目
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // 验证查询参数
    const validatedParams = ProjectSearchSchema.parse(queryParams);
    
    // 构建搜索参数
    const searchParams = {
      page: validatedParams.page,
      limit: validatedParams.limit,
      sortBy: validatedParams.sort,
      sortOrder: validatedParams.order,
      filters: {
        category_id: validatedParams.category_id,
        min_price: validatedParams.min_price,
        max_price: validatedParams.max_price,
        tech_stack: validatedParams.tech_stack,
      },
    };

    // 调用Service搜索项目
    const result = await projectService.searchProjects(validatedParams.q, searchParams);
    
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseWrapper.error(
        ErrorCode.VALIDATION_ERROR,
        '搜索参数验证失败',
        error.errors
      );
    }
    
    console.error('搜索项目失败:', error);
    return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '搜索项目失败');
  }
});
