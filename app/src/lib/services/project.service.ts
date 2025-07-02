/**
 * 项目Service
 * 处理项目相关的业务逻辑
 */

import { BaseService } from './base.service';
import { ApiResponse, ResponseWrapper, ErrorCode, QueryParams } from '@/lib/api/response';
import { Project, ProjectStatus } from '@/types';

export interface ProjectQueryParams extends QueryParams {
  category_id?: string;
  seller_id?: string;
  status?: ProjectStatus;
  featured?: boolean;
  min_price?: number;
  max_price?: number;
  tech_stack?: string[];
}

export interface CreateProjectData {
  title: string;
  description: string;
  price: number;
  category_id: string;
  tech_stack: string[];
  demo_url?: string;
  github_url?: string;
  documentation?: string;
  features: string[];
  requirements: string[];
  file_url?: string;
  thumbnail_url?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  status?: ProjectStatus;
  featured?: boolean;
  rejection_reason?: string;
}

export class ProjectService extends BaseService<Project> {
  constructor() {
    super('projects');
  }

  /**
   * 获取已发布的项目列表
   */
  async getPublishedProjects(params: ProjectQueryParams = {}): Promise<ApiResponse<Project[]>> {
    const queryParams = {
      ...params,
      filters: {
        ...params.filters,
        status: 'approved',
      },
    };

    return this.findMany(queryParams, `
      *,
      category:categories(id, name, slug),
      seller:users!seller_id(id, username, avatar_url)
    `);
  }

  /**
   * 获取用户的项目列表
   */
  async getUserProjects(userId: string, params: QueryParams = {}): Promise<ApiResponse<Project[]>> {
    const queryParams = {
      ...params,
      filters: {
        ...params.filters,
        seller_id: userId,
      },
    };

    return this.findMany(queryParams, `
      *,
      category:categories(id, name, slug)
    `);
  }

  /**
   * 获取项目详情
   */
  async getProjectDetail(id: string): Promise<ApiResponse<Project>> {
    return this.findById(id, `
      *,
      category:categories(id, name, slug),
      seller:users!seller_id(id, username, avatar_url, role)
    `);
  }

  /**
   * 创建项目
   */
  async createProject(userId: string, data: CreateProjectData): Promise<ApiResponse<Project>> {
    const projectData = {
      ...data,
      seller_id: userId,
      status: 'pending' as ProjectStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.create(projectData);
  }

  /**
   * 更新项目
   */
  async updateProject(id: string, userId: string, data: UpdateProjectData): Promise<ApiResponse<Project>> {
    // 验证项目所有权
    const project = await this.findById(id);
    if (!project.success || !project.data) {
      return ResponseWrapper.error(ErrorCode.RESOURCE_NOT_FOUND, '项目不存在');
    }

    if (project.data.seller_id !== userId) {
      return ResponseWrapper.error(ErrorCode.PERMISSION_DENIED, '您没有权限修改此项目');
    }

    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    return this.update(id, updateData);
  }

  /**
   * 管理员审核项目
   */
  async reviewProject(
    id: string, 
    status: 'approved' | 'rejected', 
    rejectionReason?: string
  ): Promise<ApiResponse<Project>> {
    const updateData: UpdateProjectData = {
      status,
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    return this.update(id, updateData);
  }

  /**
   * 设置项目为精选
   */
  async setFeatured(id: string, featured: boolean): Promise<ApiResponse<Project>> {
    return this.update(id, { featured, updated_at: new Date().toISOString() });
  }

  /**
   * 获取热门项目
   */
  async getPopularProjects(limit: number = 10): Promise<ApiResponse<Project[]>> {
    try {
      const response = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          category:categories(id, name, slug),
          seller:users!seller_id(id, username, avatar_url)
        `)
        .eq('status', 'approved')
        .order('download_count', { ascending: false })
        .order('rating_average', { ascending: false })
        .limit(limit);

      return ResponseWrapper.fromSupabase(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 获取精选项目
   */
  async getFeaturedProjects(limit: number = 6): Promise<ApiResponse<Project[]>> {
    try {
      const response = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          category:categories(id, name, slug),
          seller:users!seller_id(id, username, avatar_url)
        `)
        .eq('status', 'approved')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      return ResponseWrapper.fromSupabase(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 搜索项目
   */
  async searchProjects(query: string, params: ProjectQueryParams = {}): Promise<ApiResponse<Project[]>> {
    const searchParams = {
      ...params,
      search: query,
      filters: {
        ...params.filters,
        status: 'approved',
      },
    };

    return this.findMany(searchParams, `
      *,
      category:categories(id, name, slug),
      seller:users!seller_id(id, username, avatar_url)
    `);
  }

  /**
   * 增加项目浏览量
   */
  async incrementViews(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase.rpc('increment_project_views', {
        project_id: id
      });

      if (error) {
        console.error('增加浏览量失败:', error);
        return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '增加浏览量失败', error);
      }

      return ResponseWrapper.success(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 增加项目下载量
   */
  async incrementDownloads(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase.rpc('increment_project_downloads', {
        project_id: id
      });

      if (error) {
        console.error('增加下载量失败:', error);
        return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '增加下载量失败', error);
      }

      return ResponseWrapper.success(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 管理员删除项目
   */
  async deleteProjectAsAdmin(id: string): Promise<ApiResponse<void>> {
    // 管理员删除不需要检查所有权，但需要检查业务规则
    const validationResult = await this.validateDelete(id);
    if (!validationResult.success) {
      return validationResult as ApiResponse<void>;
    }

    return this.delete(id);
  }

  /**
   * 获取管理员项目列表（包含所有状态）
   */
  async getAdminProjects(params: ProjectQueryParams = {}): Promise<ApiResponse<Project[]>> {
    // 管理员可以查看所有状态的项目，不过滤status
    const queryParams = {
      ...params,
      filters: {
        ...params.filters,
        // 不添加status过滤
      },
    };

    return this.findMany(queryParams, `
      *,
      category:categories(id, name, slug),
      seller:users!seller_id(id, username, avatar_url)
    `);
  }

  // 重写基类方法

  /**
   * 应用搜索条件
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected applySearch(query: any, search: string): any {
    return query.or(`title.ilike.%${search}%,description.ilike.%${search}%,tech_stack.cs.{${search}}`);
  }

  /**
   * 应用过滤条件
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected applyFilters(query: any, filters: Record<string, unknown>): any {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        switch (key) {
          case 'min_price':
            query = query.gte('price', value);
            break;
          case 'max_price':
            query = query.lte('price', value);
            break;
          case 'tech_stack':
            if (Array.isArray(value) && value.length > 0) {
              query = query.overlaps('tech_stack', value);
            }
            break;
          default:
            query = query.eq(key, value);
        }
      }
    });
    return query;
  }

  /**
   * 创建前数据验证
   */
  protected async validateCreate(data: Partial<Project>): Promise<ApiResponse<void>> {
    const createData = data as CreateProjectData;

    // 验证必填字段
    if (!createData.title || createData.title.trim().length === 0) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目标题不能为空', null, 'title');
    }

    if (!createData.description || createData.description.trim().length < 10) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目描述至少需要10个字符', null, 'description');
    }

    if (!createData.price || createData.price <= 0) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目价格必须大于0', null, 'price');
    }

    if (!createData.category_id) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '请选择项目分类', null, 'category_id');
    }

    // 验证分类是否存在
    const categoryResponse = await this.supabase
      .from('categories')
      .select('id')
      .eq('id', createData.category_id)
      .single();

    if (categoryResponse.error || !categoryResponse.data) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '选择的分类不存在', null, 'category_id');
    }

    return ResponseWrapper.success(undefined);
  }

  /**
   * 更新前数据验证
   */
  protected async validateUpdate(_id: string, data: Partial<Project>): Promise<ApiResponse<void>> {
    const updateData = data as UpdateProjectData;

    // 如果更新分类，验证分类是否存在
    if (updateData.category_id) {
      const categoryResponse = await this.supabase
        .from('categories')
        .select('id')
        .eq('id', updateData.category_id)
        .single();

      if (categoryResponse.error || !categoryResponse.data) {
        return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '选择的分类不存在', null, 'category_id');
      }
    }

    // 验证价格
    if (updateData.price !== undefined && updateData.price <= 0) {
      return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '项目价格必须大于0', null, 'price');
    }

    return ResponseWrapper.success(undefined);
  }

  /**
   * 删除前验证
   */
  protected async validateDelete(id: string): Promise<ApiResponse<void>> {
    // 检查是否有相关的订单
    const orderResponse = await this.supabase
      .from('orders')
      .select('id')
      .eq('project_id', id)
      .limit(1);

    if (orderResponse.data && orderResponse.data.length > 0) {
      return ResponseWrapper.error(
        ErrorCode.BUSINESS_ERROR, 
        '该项目已有订单，无法删除'
      );
    }

    return ResponseWrapper.success(undefined);
  }
}

// 导出单例实例
export const projectService = new ProjectService();
