/**
 * 易码网统一API响应格式
 * 解决Supabase架构下响应格式统一化问题
 */

import { PostgrestError } from '@supabase/supabase-js';

// 统一响应格式接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

// 错误信息结构
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}

// 响应元数据
export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  pagination?: PaginationMeta;
  total?: number;
}

// 分页元数据
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 错误类型枚举
export enum ErrorCode {
  // 业务错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  
  // 系统错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
}

/**
 * 响应包装器类
 * 统一处理Supabase响应和业务响应
 */
export class ResponseWrapper {
  /**
   * 成功响应
   */
  static success<T>(data: T, meta?: Partial<ResponseMeta>): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        ...meta,
      },
    };
  }

  /**
   * 错误响应
   */
  static error(
    code: ErrorCode | string,
    message: string,
    details?: any,
    field?: string
  ): ApiResponse<never> {
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
        requestId: this.generateRequestId(),
      },
    };
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    data: T[],
    pagination: PaginationMeta
  ): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        pagination,
        total: pagination.total,
      },
    };
  }

  /**
   * 处理Supabase响应
   */
  static fromSupabase<T>(
    supabaseResponse: {
      data: T | null;
      error: PostgrestError | null;
      count?: number | null;
    },
    options?: {
      pagination?: Omit<PaginationMeta, 'total'>;
      transform?: (data: T) => any;
    }
  ): ApiResponse<T> {
    const { data, error, count } = supabaseResponse;

    // 处理错误
    if (error) {
      return this.handleSupabaseError(error);
    }

    // 处理空数据
    if (data === null) {
      return this.error(
        ErrorCode.RESOURCE_NOT_FOUND,
        '请求的资源不存在'
      );
    }

    // 转换数据
    const transformedData = options?.transform ? options.transform(data) : data;

    // 处理分页响应
    if (options?.pagination && count !== null) {
      const pagination: PaginationMeta = {
        ...options.pagination,
        total: count,
        totalPages: Math.ceil(count / options.pagination.limit),
        hasNext: (options.pagination.page * options.pagination.limit) < count,
        hasPrev: options.pagination.page > 1,
      };
      
      return this.paginated(Array.isArray(transformedData) ? transformedData : [transformedData], pagination);
    }

    // 普通成功响应
    return this.success(transformedData, count !== null ? { total: count } : undefined);
  }

  /**
   * 处理Supabase错误
   */
  private static handleSupabaseError(error: PostgrestError): ApiResponse<never> {
    // RLS权限错误
    if (error.code === '42501' || error.message.includes('RLS')) {
      return this.error(
        ErrorCode.PERMISSION_DENIED,
        '您没有权限执行此操作',
        error
      );
    }

    // 唯一约束违反
    if (error.code === '23505') {
      return this.error(
        ErrorCode.DUPLICATE_RESOURCE,
        '资源已存在，请检查输入数据',
        error
      );
    }

    // 外键约束违反
    if (error.code === '23503') {
      return this.error(
        ErrorCode.VALIDATION_ERROR,
        '关联的资源不存在',
        error
      );
    }

    // 数据验证错误
    if (error.code === '23514') {
      return this.error(
        ErrorCode.VALIDATION_ERROR,
        '数据验证失败，请检查输入格式',
        error
      );
    }

    // 默认数据库错误
    return this.error(
      ErrorCode.DATABASE_ERROR,
      error.message || '数据库操作失败',
      error
    );
  }

  /**
   * 生成请求ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 业务异常类
 */
export class BusinessError extends Error {
  constructor(
    public code: ErrorCode | string,
    message: string,
    public details?: any,
    public field?: string
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * 异步操作结果类型
 */
export type AsyncResult<T> = Promise<ApiResponse<T>>;

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * 排序参数
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 通用查询参数
 */
export interface QueryParams extends PaginationParams, SortParams {
  search?: string;
  filters?: Record<string, any>;
}
