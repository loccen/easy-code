/**
 * 前端API客户端
 * 提供统一的数据访问接口，支持直接Supabase调用和API Routes调用
 */

import { createClient } from '@/lib/supabase/client';
import { ApiResponse, ResponseWrapper, ErrorCode } from './response';
import { SupabaseClient } from '@supabase/supabase-js';

// API调用配置
interface ApiConfig {
  useApiRoutes?: boolean; // 是否使用API Routes
  timeout?: number;       // 请求超时时间
  retries?: number;       // 重试次数
}

// 请求选项
interface RequestOptions extends ApiConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * 统一API客户端
 */
export class ApiClient {
  private supabase: SupabaseClient;
  private baseUrl: string;
  private defaultConfig: ApiConfig;

  constructor(config: ApiConfig = {}) {
    this.supabase = createClient();
    this.baseUrl = '/api';
    this.defaultConfig = {
      useApiRoutes: false,
      timeout: 30000,
      retries: 3,
      ...config,
    };
  }

  /**
   * 直接调用Supabase
   */
  async callSupabase<T>(
    operation: (client: SupabaseClient) => Promise<{
      data: T | null;
      error: any;
      count?: number | null;
    }>,
    options?: {
      transform?: (data: T) => any;
      pagination?: any;
    }
  ): Promise<ApiResponse<T>> {
    try {
      const response = await operation(this.supabase);
      return ResponseWrapper.fromSupabase(response, options);
    } catch (error) {
      console.error('Supabase call error:', error);
      return ResponseWrapper.error(
        ErrorCode.NETWORK_ERROR,
        '网络请求失败',
        error
      );
    }
  }

  /**
   * 调用API Routes
   */
  async callApi<T>(
    endpoint: string,
    options: RequestOptions & {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      params?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      params,
      headers = {},
      timeout = this.defaultConfig.timeout,
      retries = this.defaultConfig.retries,
      signal,
    } = options;

    // 构建URL
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    // 构建请求配置
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout!);

    try {
      const response = await this.fetchWithRetry(url, {
        ...fetchOptions,
        signal: signal || controller.signal,
      }, retries!);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return ResponseWrapper.error(
          errorData.error?.code || ErrorCode.NETWORK_ERROR,
          errorData.error?.message || `HTTP ${response.status}`,
          errorData.error?.details
        );
      }

      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return ResponseWrapper.error(
          ErrorCode.NETWORK_ERROR,
          '请求超时',
          error
        );
      }

      return ResponseWrapper.error(
        ErrorCode.NETWORK_ERROR,
        '网络请求失败',
        error
      );
    }
  }

  /**
   * 智能调用 - 根据配置选择调用方式
   */
  async call<T>(
    operation: {
      supabase?: (client: SupabaseClient) => Promise<{
        data: T | null;
        error: any;
        count?: number | null;
      }>;
      api?: {
        endpoint: string;
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        body?: any;
        params?: Record<string, string>;
      };
    },
    options: RequestOptions & {
      transform?: (data: T) => any;
      pagination?: any;
    } = {}
  ): Promise<ApiResponse<T>> {
    const useApiRoutes = options.useApiRoutes ?? this.defaultConfig.useApiRoutes;

    if (useApiRoutes && operation.api) {
      return this.callApi<T>(operation.api.endpoint, {
        ...options,
        ...operation.api,
      });
    } else if (operation.supabase) {
      return this.callSupabase<T>(operation.supabase, {
        transform: options.transform,
        pagination: options.pagination,
      });
    } else {
      return ResponseWrapper.error(
        ErrorCode.INTERNAL_ERROR,
        '无效的操作配置'
      );
    }
  }

  /**
   * 带重试的fetch
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number
  ): Promise<Response> {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url, options);
        
        // 如果是网络错误或5xx错误，进行重试
        if (response.status >= 500 && i < retries) {
          await this.delay(Math.pow(2, i) * 1000); // 指数退避
          continue;
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        
        // 如果是最后一次重试，抛出错误
        if (i === retries) {
          throw error;
        }
        
        // 等待后重试
        await this.delay(Math.pow(2, i) * 1000);
      }
    }

    throw lastError!;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 实时订阅包装器
   */
  subscribeToChanges<T>(
    table: string,
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: T | null;
      old: T | null;
    }) => void,
    filter?: string
  ) {
    const channel = this.supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          // 包装实时数据为统一格式
          callback({
            eventType: payload.eventType as any,
            new: payload.new as T,
            old: payload.old as T,
          });
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    
    if (error || !user) {
      return ResponseWrapper.error(ErrorCode.UNAUTHORIZED, '用户未登录');
    }

    return ResponseWrapper.success(user);
  }

  /**
   * 上传文件
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options?: {
      cacheControl?: string;
      contentType?: string;
      upsert?: boolean;
    }
  ): Promise<ApiResponse<{ path: string; fullPath: string }>> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, options);

      if (error) {
        return ResponseWrapper.error(
          ErrorCode.INTERNAL_ERROR,
          '文件上传失败',
          error
        );
      }

      const { data: { publicUrl } } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return ResponseWrapper.success({
        path: data.path,
        fullPath: publicUrl,
      });
    } catch (error) {
      return ResponseWrapper.error(
        ErrorCode.INTERNAL_ERROR,
        '文件上传失败',
        error
      );
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(bucket: string, paths: string[]): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        return ResponseWrapper.error(
          ErrorCode.INTERNAL_ERROR,
          '文件删除失败',
          error
        );
      }

      return ResponseWrapper.success(undefined);
    } catch (error) {
      return ResponseWrapper.error(
        ErrorCode.INTERNAL_ERROR,
        '文件删除失败',
        error
      );
    }
  }
}

// 导出默认实例
export const apiClient = new ApiClient();

// 导出配置了API Routes的实例
export const apiRoutesClient = new ApiClient({ useApiRoutes: true });
