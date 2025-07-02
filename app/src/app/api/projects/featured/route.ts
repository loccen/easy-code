/**
 * 精选项目API路由
 * GET /api/projects/featured - 获取精选项目
 */

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/middleware';
import { projectService } from '@/lib/services/project.service';
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';
import { z } from 'zod';

// 精选项目查询参数Schema
const FeaturedProjectQuerySchema = z.object({
  limit: z.string().transform(val => Math.min(parseInt(val) || 6, 20)).optional(),
});

/**
 * GET /api/projects/featured
 * 获取精选项目
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // 验证查询参数
    const validatedParams = FeaturedProjectQuerySchema.parse(queryParams);
    
    // 调用Service获取精选项目
    const result = await projectService.getFeaturedProjects(validatedParams.limit);
    
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseWrapper.error(
        ErrorCode.VALIDATION_ERROR,
        '查询参数验证失败',
        error.errors
      );
    }
    
    console.error('获取精选项目失败:', error);
    return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '获取精选项目失败');
  }
});
