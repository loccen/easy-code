/**
 * 认证服务
 * 完全通过API Routes访问认证功能
 */

import { apiClient, authTokenManager } from '@/lib/api/fetch-client';
import { ApiResponse } from '@/lib/api/types';
import type { AuthUser } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface LoginResponse {
  user: AuthUser;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export interface ResetPasswordRequest {
  email: string;
}

/**
 * 认证服务类
 */
export class AuthService {
  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    
    // 如果登录成功，保存token
    if (response.success && response.data?.session?.access_token) {
      authTokenManager.setToken(response.data.session.access_token);
    }
    
    return response;
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>('/auth/register', userData);
    
    // 如果注册成功，保存token
    if (response.success && response.data?.session?.access_token) {
      authTokenManager.setToken(response.data.session.access_token);
    }
    
    return response;
  }

  /**
   * 用户登出
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.post('/auth/logout');
    
    // 清除本地token
    authTokenManager.setToken(null);
    
    return response;
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    return apiClient.get<AuthUser>('/auth/me');
  }

  /**
   * 重置密码
   */
  async resetPassword(request: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/auth/reset-password', request);
  }

  /**
   * 检查用户名是否可用
   */
  async checkUsernameAvailable(username: string): Promise<ApiResponse<{ available: boolean }>> {
    return apiClient.get('/auth/check-username', { username });
  }

  /**
   * 检查邮箱是否可用
   */
  async checkEmailAvailable(email: string): Promise<ApiResponse<{ available: boolean }>> {
    return apiClient.get('/auth/check-email', { email });
  }

  /**
   * 刷新用户token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    
    // 如果刷新成功，更新token
    if (response.success && response.data?.session?.access_token) {
      authTokenManager.setToken(response.data.session.access_token);
    }
    
    return response;
  }

  /**
   * 更新用户资料
   */
  async updateProfile(profileData: Partial<AuthUser>): Promise<ApiResponse<AuthUser>> {
    return apiClient.put<AuthUser>('/auth/profile', profileData);
  }

  /**
   * 更改密码
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/auth/change-password', data);
  }

  /**
   * 删除账户
   */
  async deleteAccount(password: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete('/auth/account', {
      body: { password },
    });
    
    // 如果删除成功，清除本地token
    if (response.success) {
      authTokenManager.setToken(null);
    }
    
    return response;
  }

  /**
   * 上传头像
   */
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatar_url: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    // 对于文件上传，需要特殊处理
    return apiClient.request('/auth/avatar', {
      method: 'POST',
      body: formData,
      headers: {
        // 不设置Content-Type，让浏览器自动设置multipart/form-data
      },
    });
  }

  /**
   * 删除头像
   */
  async deleteAvatar(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete('/auth/avatar');
  }

  /**
   * 获取用户公开信息
   */
  async getPublicUserInfo(userId: string): Promise<ApiResponse<{
    id: string;
    username: string;
    avatar_url?: string;
    created_at: string;
  }>> {
    return apiClient.get(`/users/${userId}/public`);
  }
}

// 导出单例实例
export const authService = new AuthService();
