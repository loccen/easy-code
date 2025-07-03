/**
 * 简化的API客户端
 * 专门用于App Router架构 - 只通过API Routes访问数据
 */

import { ApiResponse, ErrorCode } from './types';

// 请求配置接口
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  timeout?: number;
}

// 认证token管理
class AuthTokenManager {
  private static instance: AuthTokenManager;
  private token: string | null = null;

  static getInstance(): AuthTokenManager {
    if (!AuthTokenManager.instance) {
      AuthTokenManager.instance = new AuthTokenManager();
    }
    return AuthTokenManager.instance;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  getAuthHeaders(): Record<string, string> {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }
}

/**
 * 统一的API客户端
 * 只通过Next.js API Routes访问数据
 */
export class FetchClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private authManager: AuthTokenManager;

  constructor(baseUrl = '/api', timeout = 30000) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
    this.authManager = AuthTokenManager.getInstance();
  }

  /**
   * 设置认证token
   */
  setAuthToken(token: string | null) {
    this.authManager.setToken(token);
  }

  /**
   * 通用请求方法
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      params,
      headers = {},
      timeout = this.defaultTimeout,
    } = config;

    // 构建URL
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // 构建请求配置
    const fetchConfig: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.authManager.getAuthHeaders(),
        ...headers,
      },
    };

    // 添加请求体
    if (body && method !== 'GET') {
      fetchConfig.body = JSON.stringify(body);
    }

    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchConfig.signal = controller.signal;

    try {
      const response = await fetch(url, fetchConfig);
      clearTimeout(timeoutId);

      // 解析响应
      const data = await response.json();

      // 检查响应状态
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || ErrorCode.SERVER_ERROR,
            message: data.error?.message || `HTTP ${response.status}`,
            details: data.error?.details,
          },
          meta: data.meta,
        };
      }

      return data as ApiResponse<T>;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: ErrorCode.NETWORK_ERROR,
            message: '请求超时',
          },
        };
      }

      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: '网络请求失败',
          details: error.message,
        },
      };
    }
  }

  /**
   * GET请求
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    config?: Omit<RequestConfig, 'method' | 'params'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET', params });
  }

  /**
   * POST请求
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT请求
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(
    endpoint: string,
    config?: Omit<RequestConfig, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }
}

// 导出单例实例
export const apiClient = new FetchClient();

// 导出认证token管理器
export const authTokenManager = AuthTokenManager.getInstance();
