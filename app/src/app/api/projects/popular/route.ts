/**
 * 热门项目API路由
 * GET /api/projects/popular - 获取热门项目
 */

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/middleware';
import { projectService } from '@/lib/services/project.service';
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';
import { z } from 'zod';

// 热门项目查询参数Schema
const PopularProjectQuerySchema = z.object({
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 50)).optional(),
});

/**
 * GET /api/projects/popular
 * 获取热门项目
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // 验证查询参数
    const validatedParams = PopularProjectQuerySchema.parse(queryParams);
    
    // 调用Service获取热门项目
    const result = await projectService.getPopularProjects(validatedParams.limit);
    
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseWrapper.error(
        ErrorCode.VALIDATION_ERROR,
        '查询参数验证失败',
        error.errors
      );
    }
    
    console.error('获取热门项目失败:', error);
    return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '获取热门项目失败');
  }
});
