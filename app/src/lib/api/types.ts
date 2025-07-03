/**
 * 统一API响应格式类型定义
 * 用于App Router架构重构
 */

// 基础响应接口
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

// 错误信息接口
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  field?: string; // 用于表单验证错误
}

// 响应元数据接口
export interface ResponseMeta {
  total?: number;        // 总记录数
  page?: number;         // 当前页码
  limit?: number;        // 每页记录数
  hasMore?: boolean;     // 是否有更多数据
  timestamp?: string;    // 响应时间戳
}

// 分页请求参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// 排序参数
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 搜索参数
export interface SearchParams {
  search?: string;
  categoryId?: string;
  status?: string;
}

// 统一的请求参数类型
export interface ApiRequestParams extends PaginationParams, SortParams, SearchParams {
  [key: string]: unknown;
}

// 错误代码枚举
export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // 业务错误
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  ALREADY_PURCHASED = 'ALREADY_PURCHASED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // 系统错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
}

// 响应构建器类
export class ResponseBuilder {
  /**
   * 构建成功响应
   */
  static success<T>(data: T, meta?: ResponseMeta): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * 构建错误响应
   */
  static error(
    code: ErrorCode | string,
    message: string,
    details?: unknown,
    field?: string
  ): ApiResponse<null> {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        field,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 构建分页响应
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): ApiResponse<T[]> {
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        hasMore,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 从Supabase响应构建API响应
   */
  static fromSupabase<T>(
    supabaseResponse: {
      data: T | null;
      error: any;
      count?: number | null;
    },
    options?: {
      page?: number;
      limit?: number;
    }
  ): ApiResponse<T> {
    if (supabaseResponse.error) {
      return ResponseBuilder.error(
        ErrorCode.DATABASE_ERROR,
        supabaseResponse.error.message || '数据库操作失败',
        supabaseResponse.error
      );
    }

    if (supabaseResponse.data === null) {
      return ResponseBuilder.error(
        ErrorCode.NOT_FOUND,
        '未找到请求的数据'
      );
    }

    // 处理分页响应
    if (options?.page && options?.limit && supabaseResponse.count !== null) {
      return ResponseBuilder.paginated(
        Array.isArray(supabaseResponse.data) ? supabaseResponse.data : [supabaseResponse.data],
        supabaseResponse.count,
        options.page,
        options.limit
      );
    }

    return ResponseBuilder.success(supabaseResponse.data);
  }
}

// 中间件类型定义
export type ApiHandler = (
  request: Request,
  context?: { params?: any }
) => Promise<Response>;

export type ApiMiddleware = (
  handler: ApiHandler
) => ApiHandler;

// 认证上下文
export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSeller: boolean;
}

// 请求上下文
export interface RequestContext {
  auth: AuthContext;
  params: any;
  searchParams: URLSearchParams;
}
