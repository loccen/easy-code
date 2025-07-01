/**
 * API中间件
 * 提供统一的请求处理、验证和响应格式化
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ResponseWrapper, ErrorCode, BusinessError } from './response';
import { z } from 'zod';

// API处理器类型
export type ApiHandler = (
  req: NextRequest,
  context?: {
    params?: Record<string, string>;
    user?: AuthenticatedUser;
    body?: unknown;
    query?: URLSearchParams | unknown;
    pagination?: {
      page: number;
      limit: number;
      offset: number;
    };
    requestContext?: RequestContext;
  }
) => Promise<Response>;

// 认证用户信息
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

// 请求上下文
export interface RequestContext {
  user?: AuthenticatedUser;
  params?: Record<string, string>;
  query?: URLSearchParams;
}

/**
 * API路由包装器
 * 提供统一的错误处理和响应格式化
 */
export function withApiHandler(handler: ApiHandler) {
  return async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      const result = await handler(req, context);
      
      // 如果返回的已经是Response对象，直接返回
      if (result instanceof NextResponse || result instanceof Response) {
        return result;
      }

      // 如果返回的是ApiResponse格式，直接返回
      if (result && typeof result === 'object' && 'success' in result) {
        const apiResponse = result as { success: boolean; error?: { code?: string } };
        return NextResponse.json(result, {
          status: apiResponse.success ? 200 : getErrorStatusCode(apiResponse.error?.code),
        });
      }

      // 包装普通数据为成功响应
      return NextResponse.json(ResponseWrapper.success(result));
    } catch (error) {
      console.error('API Handler Error:', error);
      return handleApiError(error);
    }
  };
}

/**
 * 需要认证的API包装器
 */
export function withAuth(handler: ApiHandler) {
  return withApiHandler(async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        ResponseWrapper.error(ErrorCode.UNAUTHORIZED, '请先登录'),
        { status: 401 }
      );
    }

    const requestContext: RequestContext = {
      user,
      params: context?.params,
      query: new URL(req.url).searchParams,
    };

    return handler(req, { ...context, user, requestContext });
  });
}

/**
 * 需要特定角色的API包装器
 */
export function withRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (handler: ApiHandler) => {
    return withAuth(async (req: NextRequest, context?: { params?: Record<string, string>; user?: AuthenticatedUser }) => {
      const user = context?.user as AuthenticatedUser;
      
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          ResponseWrapper.error(ErrorCode.PERMISSION_DENIED, '权限不足'),
          { status: 403 }
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * 请求体验证包装器
 */
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return (handler: ApiHandler) => {
    return withApiHandler(async (req: NextRequest, context?: { params?: Record<string, string> }) => {
      try {
        const body = await req.json();
        const validatedData = schema.parse(body);
        
        return handler(req, { ...context, body: validatedData });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            ResponseWrapper.error(
              ErrorCode.VALIDATION_ERROR,
              '请求数据验证失败',
              error.errors
            ),
            { status: 400 }
          );
        }
        throw error;
      }
    });
  };
}

/**
 * 查询参数验证包装器
 */
export function withQueryValidation<T>(schema: z.ZodSchema<T>) {
  return (handler: ApiHandler) => {
    return withApiHandler(async (req: NextRequest, context?: { params?: Record<string, string> }) => {
      try {
        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validatedQuery = schema.parse(queryParams);
        
        return handler(req, { ...context, query: validatedQuery });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            ResponseWrapper.error(
              ErrorCode.VALIDATION_ERROR,
              '查询参数验证失败',
              error.errors
            ),
            { status: 400 }
          );
        }
        throw error;
      }
    });
  };
}

/**
 * 分页参数处理包装器
 */
export function withPagination(handler: ApiHandler) {
  return withApiHandler(async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 限制每页最大数量
    const maxLimit = 100;
    const actualLimit = Math.min(limit, maxLimit);

    const pagination = {
      page: Math.max(1, page),
      limit: actualLimit,
      offset: Math.max(0, offset),
    };

    return handler(req, { ...context, pagination });
  });
}

/**
 * 获取当前用户
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getCurrentUser(_req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // 获取用户详细信息
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, status')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return null;
    }

    return {
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
      status: userProfile.status,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * 处理API错误
 */
function handleApiError(error: unknown): NextResponse {
  if (error instanceof BusinessError) {
    return NextResponse.json(
      ResponseWrapper.error(error.code, error.message, error.details, error.field),
      { status: getErrorStatusCode(error.code) }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      ResponseWrapper.error(
        ErrorCode.VALIDATION_ERROR,
        '数据验证失败',
        error.errors
      ),
      { status: 400 }
    );
  }

  // 默认内部服务器错误
  return NextResponse.json(
    ResponseWrapper.error(
      ErrorCode.INTERNAL_ERROR,
      '服务器内部错误'
    ),
    { status: 500 }
  );
}

/**
 * 根据错误代码获取HTTP状态码
 */
function getErrorStatusCode(errorCode?: string): number {
  switch (errorCode) {
    case ErrorCode.VALIDATION_ERROR:
      return 400;
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.TOKEN_EXPIRED:
    case ErrorCode.INVALID_CREDENTIALS:
      return 401;
    case ErrorCode.PERMISSION_DENIED:
      return 403;
    case ErrorCode.RESOURCE_NOT_FOUND:
      return 404;
    case ErrorCode.DUPLICATE_RESOURCE:
      return 409;
    case ErrorCode.BUSINESS_ERROR:
      return 422;
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 503;
    default:
      return 500;
  }
}

/**
 * 常用的验证Schema
 */
export const CommonSchemas = {
  // ID验证
  id: z.string().uuid('无效的ID格式'),
  
  // 分页参数
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  }),
  
  // 排序参数
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
  
  // 搜索参数
  search: z.object({
    search: z.string().optional(),
  }),
};

/**
 * 组合多个包装器
 */
export function compose(...wrappers: Array<(handler: ApiHandler) => ApiHandler>) {
  return (handler: ApiHandler) => {
    return wrappers.reduceRight((acc, wrapper) => wrapper(acc), handler);
  };
}
