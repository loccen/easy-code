/**
 * API工具函数
 * 用于App Router架构重构
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { 
  ApiResponse, 
  ResponseBuilder, 
  ErrorCode, 
  AuthContext, 
  RequestContext,
  ApiRequestParams 
} from './types';

/**
 * 解析请求参数
 */
export function parseRequestParams(request: NextRequest): ApiRequestParams {
  const { searchParams } = new URL(request.url);
  
  const params: ApiRequestParams = {};
  
  // 分页参数
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');
  
  if (page) params.page = parseInt(page, 10);
  if (limit) params.limit = parseInt(limit, 10);
  if (offset) params.offset = parseInt(offset, 10);
  
  // 排序参数
  const sortBy = searchParams.get('sortBy') || searchParams.get('sort');
  const sortOrder = searchParams.get('sortOrder') || searchParams.get('order');
  
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) {
    params.sortOrder = sortOrder;
  }
  
  // 搜索参数
  const search = searchParams.get('search');
  const categoryId = searchParams.get('categoryId') || searchParams.get('category_id');
  const status = searchParams.get('status');
  
  if (search) params.search = search;
  if (categoryId) params.categoryId = categoryId;
  if (status) params.status = status;
  
  // 其他参数
  searchParams.forEach((value, key) => {
    if (!['page', 'limit', 'offset', 'sortBy', 'sort', 'sortOrder', 'order', 
          'search', 'categoryId', 'category_id', 'status'].includes(key)) {
      params[key] = value;
    }
  });
  
  return params;
}

/**
 * 解析请求体
 */
export async function parseRequestBody<T = any>(request: NextRequest): Promise<T | null> {
  try {
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await request.json();
    }
    
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const body: any = {};
      formData.forEach((value, key) => {
        body[key] = value;
      });
      return body;
    }
    
    return null;
  } catch (error) {
    console.error('解析请求体失败:', error);
    return null;
  }
}

/**
 * 获取认证上下文
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 从请求头获取Authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        isSeller: false,
      };
    }
    
    const token = authHeader.substring(7);
    
    // 验证token并获取用户信息
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return {
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        isSeller: false,
      };
    }
    
    // 获取用户详细信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, status')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData || userData.status === 'deleted') {
      return {
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        isSeller: false,
      };
    }
    
    return {
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
      },
      isAuthenticated: true,
      isAdmin: userData.role === 'admin',
      isSeller: userData.role === 'seller' || userData.role === 'admin',
    };
  } catch (error) {
    console.error('获取认证上下文失败:', error);
    return {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isSeller: false,
    };
  }
}

/**
 * 构建请求上下文
 */
export async function buildRequestContext(
  request: NextRequest,
  params?: any
): Promise<RequestContext> {
  const auth = await getAuthContext(request);
  const { searchParams } = new URL(request.url);
  
  return {
    auth,
    params: params || {},
    searchParams,
  };
}

/**
 * 创建API响应
 */
export function createApiResponse<T>(response: ApiResponse<T>): Response {
  const status = response.success ? 200 : getErrorStatus(response.error?.code);
  
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * 根据错误代码获取HTTP状态码
 */
function getErrorStatus(errorCode?: string): number {
  switch (errorCode) {
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.NOT_FOUND:
    case ErrorCode.USER_NOT_FOUND:
    case ErrorCode.PROJECT_NOT_FOUND:
      return 404;
    case ErrorCode.CONFLICT:
    case ErrorCode.ALREADY_PURCHASED:
      return 409;
    case ErrorCode.VALIDATION_ERROR:
      return 422;
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.SERVER_ERROR:
      return 500;
    default:
      return 400;
  }
}

/**
 * 处理API错误
 */
export function handleApiError(error: any): ApiResponse<null> {
  console.error('API错误:', error);
  
  if (error.code === 'PGRST116') {
    return ResponseBuilder.error(
      ErrorCode.NOT_FOUND,
      '未找到请求的资源'
    );
  }
  
  if (error.message?.includes('duplicate key')) {
    return ResponseBuilder.error(
      ErrorCode.CONFLICT,
      '资源已存在'
    );
  }
  
  if (error.message?.includes('foreign key')) {
    return ResponseBuilder.error(
      ErrorCode.VALIDATION_ERROR,
      '关联数据不存在'
    );
  }
  
  return ResponseBuilder.error(
    ErrorCode.SERVER_ERROR,
    error.message || '服务器内部错误',
    error
  );
}

/**
 * 验证必需参数
 */
export function validateRequiredParams(
  params: any,
  required: string[]
): ApiResponse<null> | null {
  const missing = required.filter(key => !params[key]);
  
  if (missing.length > 0) {
    return ResponseBuilder.error(
      ErrorCode.VALIDATION_ERROR,
      `缺少必需参数: ${missing.join(', ')}`
    );
  }
  
  return null;
}

/**
 * 验证分页参数
 */
export function validatePaginationParams(params: ApiRequestParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = params.offset || (page - 1) * limit;
  
  return { page, limit, offset };
}
