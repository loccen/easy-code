/**
 * 项目服务
 * 完全通过API Routes访问项目功能
 */

import { apiClient } from '@/lib/api/fetch-client';
import { ApiResponse } from '@/lib/api/types';
import type { Project } from '@/types';

export interface ProjectQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  sellerId?: string;
  status?: string;
  sortBy?: 'created_at' | 'price' | 'rating_average' | 'download_count' | 'view_count';
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  techStack?: string[];
}

export interface CreateProjectRequest {
  title: string;
  short_description?: string;
  description: string;
  category_id?: string;
  price: number;
  tech_stack?: string[];
  demo_url?: string;
  github_url?: string;
  documentation_url?: string;
  is_dockerized?: boolean;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  featured?: boolean;
  rejection_reason?: string;
}

/**
 * 项目服务类
 */
export class ProjectsService {
  /**
   * 获取已发布的项目列表
   */
  async getPublishedProjects(params: ProjectQueryParams = {}): Promise<ApiResponse<Project[]>> {
    return apiClient.get<Project[]>('/projects', {
      ...params,
      status: 'approved', // 强制只获取已发布的项目
    });
  }

  /**
   * 搜索项目
   */
  async searchProjects(query: string, params: Omit<ProjectQueryParams, 'search'> = {}): Promise<ApiResponse<Project[]>> {
    return apiClient.get<Project[]>('/projects/search', {
      q: query,
      ...params,
    });
  }

  /**
   * 获取精选项目
   */
  async getFeaturedProjects(params: Omit<ProjectQueryParams, 'featured'> = {}): Promise<ApiResponse<Project[]>> {
    return apiClient.get<Project[]>('/projects/featured', params);
  }

  /**
   * 获取热门项目
   */
  async getPopularProjects(params: ProjectQueryParams = {}): Promise<ApiResponse<Project[]>> {
    return apiClient.get<Project[]>('/projects/popular', params);
  }

  /**
   * 获取单个项目详情
   */
  async getProject(id: string): Promise<ApiResponse<Project>> {
    return apiClient.get<Project>(`/projects/${id}`);
  }

  /**
   * 创建项目
   */
  async createProject(projectData: CreateProjectRequest): Promise<ApiResponse<Project>> {
    return apiClient.post<Project>('/projects', projectData);
  }

  /**
   * 更新项目
   */
  async updateProject(id: string, projectData: UpdateProjectRequest): Promise<ApiResponse<Project>> {
    return apiClient.put<Project>(`/projects/${id}`, projectData);
  }

  /**
   * 删除项目
   */
  async deleteProject(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/projects/${id}`);
  }

  /**
   * 增加项目浏览量
   */
  async incrementViews(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/projects/${id}/views`);
  }

  /**
   * 获取卖家的项目列表
   */
  async getSellerProjects(sellerId: string, params: Omit<ProjectQueryParams, 'sellerId'> = {}): Promise<ApiResponse<Project[]>> {
    return apiClient.get<Project[]>('/projects', {
      ...params,
      sellerId,
    });
  }

  /**
   * 获取当前用户的项目列表
   */
  async getMyProjects(params: Omit<ProjectQueryParams, 'sellerId'> = {}): Promise<ApiResponse<Project[]>> {
    return apiClient.get<Project[]>('/seller/projects', params);
  }

  /**
   * 上传项目文件
   */
  async uploadProjectFiles(projectId: string, files: File[]): Promise<ApiResponse<{ file_urls: string[] }>> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    return apiClient.request(`/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
      headers: {
        // 不设置Content-Type，让浏览器自动设置multipart/form-data
      },
    });
  }

  /**
   * 上传项目缩略图
   */
  async uploadThumbnail(projectId: string, file: File): Promise<ApiResponse<{ thumbnail_url: string }>> {
    const formData = new FormData();
    formData.append('thumbnail', file);

    return apiClient.request(`/projects/${projectId}/thumbnail`, {
      method: 'POST',
      body: formData,
      headers: {
        // 不设置Content-Type，让浏览器自动设置multipart/form-data
      },
    });
  }

  /**
   * 下载项目文件
   */
  async downloadProject(projectId: string): Promise<ApiResponse<{ download_url: string }>> {
    return apiClient.post(`/projects/${projectId}/download`);
  }

  /**
   * 检查用户是否已购买项目
   */
  async checkPurchased(projectId: string): Promise<ApiResponse<{ purchased: boolean }>> {
    return apiClient.get(`/projects/${projectId}/purchased`);
  }

  // 管理员相关方法

  /**
   * 管理员获取所有项目
   */
  async getAllProjectsForAdmin(params: ProjectQueryParams = {}): Promise<ApiResponse<Project[]>> {
    return apiClient.get<Project[]>('/admin/projects', params);
  }

  /**
   * 管理员审核项目
   */
  async reviewProject(
    id: string, 
    action: 'approve' | 'reject', 
    reason?: string
  ): Promise<ApiResponse<Project>> {
    return apiClient.post(`/admin/projects/${id}/review`, {
      action,
      reason,
    });
  }

  /**
   * 管理员设置项目为精选
   */
  async setFeatured(id: string, featured: boolean): Promise<ApiResponse<Project>> {
    return apiClient.patch(`/admin/projects/${id}`, { featured });
  }

  /**
   * 管理员删除项目
   */
  async deleteProjectAsAdmin(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/admin/projects/${id}`);
  }
}

// 导出单例实例
export const projectsService = new ProjectsService();
