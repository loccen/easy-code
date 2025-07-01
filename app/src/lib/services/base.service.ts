/**
 * 基础Service类
 * 提供统一的数据访问和业务逻辑处理
 */

import { supabase } from '@/lib/supabase';
import { ResponseWrapper, ApiResponse, BusinessError, ErrorCode, QueryParams } from '@/lib/api/response';
import { SupabaseClient } from '@supabase/supabase-js';

export abstract class BaseService<T = unknown> {
  protected supabase: SupabaseClient;
  protected tableName: string;

  constructor(tableName: string) {
    this.supabase = supabase;
    this.tableName = tableName;
  }

  /**
   * 根据ID查找单个记录
   */
  async findById(id: string, select?: string): Promise<ApiResponse<T>> {
    try {
      const query = this.supabase
        .from(this.tableName)
        .select(select || '*')
        .eq('id', id)
        .single();

      const response = await query;
      return ResponseWrapper.fromSupabase(response) as ApiResponse<T>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 查找多个记录
   */
  async findMany(params: QueryParams = {}, select?: string): Promise<ApiResponse<T[]>> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(select || '*', { count: 'exact' });

      // 应用搜索条件
      if (params.search) {
        query = this.applySearch(query, params.search);
      }

      // 应用过滤条件
      if (params.filters) {
        query = this.applyFilters(query, params.filters);
      }

      // 应用排序
      if (params.sortBy) {
        query = query.order(params.sortBy, { 
          ascending: params.sortOrder !== 'desc' 
        });
      }

      // 应用分页
      if (params.page && params.limit) {
        const offset = (params.page - 1) * params.limit;
        query = query.range(offset, offset + params.limit - 1);
      } else if (params.offset !== undefined && params.limit) {
        query = query.range(params.offset, params.offset + params.limit - 1);
      }

      const response = await query;
      
      // 处理分页响应
      if (params.page && params.limit && response.count !== null) {
        const pagination = {
          page: params.page,
          limit: params.limit,
          total: response.count || 0,
          totalPages: Math.ceil((response.count || 0) / params.limit),
          hasNext: (params.page * params.limit) < (response.count || 0),
          hasPrev: params.page > 1,
        };
        return ResponseWrapper.fromSupabase(response, { pagination }) as ApiResponse<T[]>;
      }

      return ResponseWrapper.fromSupabase(response) as ApiResponse<T[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 创建记录
   */
  async create(data: Partial<T>, select?: string): Promise<ApiResponse<T>> {
    try {
      // 数据验证
      const validationResult = await this.validateCreate(data);
      if (!validationResult.success) {
        return validationResult as ApiResponse<T>;
      }

      // 业务逻辑处理
      const processedData = await this.beforeCreate(data);

      const response = await this.supabase
        .from(this.tableName)
        .insert(processedData)
        .select(select || '*')
        .single();

      const result = ResponseWrapper.fromSupabase(response) as ApiResponse<T>;

      // 创建后处理
      if (result.success && result.data) {
        await this.afterCreate(result.data as T);
      }

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 更新记录
   */
  async update(id: string, data: Partial<T>, select?: string): Promise<ApiResponse<T>> {
    try {
      // 数据验证
      const validationResult = await this.validateUpdate(id, data);
      if (!validationResult.success) {
        return validationResult as ApiResponse<T>;
      }

      // 业务逻辑处理
      const processedData = await this.beforeUpdate(id, data);

      const response = await this.supabase
        .from(this.tableName)
        .update(processedData)
        .eq('id', id)
        .select(select || '*')
        .single();

      const result = ResponseWrapper.fromSupabase(response) as ApiResponse<T>;

      // 更新后处理
      if (result.success && result.data) {
        await this.afterUpdate(result.data as T);
      }

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      // 删除前验证
      const validationResult = await this.validateDelete(id);
      if (!validationResult.success) {
        return validationResult;
      }

      // 删除前处理
      await this.beforeDelete(id);

      const response = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (response.error) {
        return ResponseWrapper.fromSupabase(response) as ApiResponse<void>;
      }

      // 删除后处理
      await this.afterDelete(id);

      return ResponseWrapper.success(undefined) as ApiResponse<void>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 统计记录数量
   */
  async count(filters?: Record<string, unknown>): Promise<ApiResponse<number>> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const response = await query;
      
      if (response.error) {
        return ResponseWrapper.error(ErrorCode.DATABASE_ERROR, response.error.message) as ApiResponse<number>;
      }

      return ResponseWrapper.success(response.count || 0) as ApiResponse<number>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 钩子方法 - 子类可以重写这些方法来实现特定的业务逻辑

  /**
   * 创建前数据验证
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async validateCreate(_data: Partial<T>): Promise<ApiResponse<void>> {
    return ResponseWrapper.success(undefined);
  }

  /**
   * 更新前数据验证
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async validateUpdate(_id: string, _data: Partial<T>): Promise<ApiResponse<void>> {
    return ResponseWrapper.success(undefined);
  }

  /**
   * 删除前验证
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async validateDelete(_id: string): Promise<ApiResponse<void>> {
    return ResponseWrapper.success(undefined);
  }

  /**
   * 创建前数据处理
   */
  protected async beforeCreate(data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  /**
   * 更新前数据处理
   */
  protected async beforeUpdate(_id: string, data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  /**
   * 删除前处理
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async beforeDelete(_id: string): Promise<void> {
    // 默认不做任何处理
  }

  /**
   * 创建后处理
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async afterCreate(_data: T): Promise<void> {
    // 默认不做任何处理
  }

  /**
   * 更新后处理
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async afterUpdate(_data: T): Promise<void> {
    // 默认不做任何处理
  }

  /**
   * 删除后处理
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async afterDelete(_id: string): Promise<void> {
    // 默认不做任何处理
  }

  /**
   * 应用搜索条件 - 子类需要实现
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract applySearch(query: any, search: string): any;

  /**
   * 应用过滤条件 - 子类可以重写
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected applyFilters(query: any, filters: Record<string, unknown>): any {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    });
    return query;
  }

  /**
   * 错误处理
   */
  protected handleError(error: unknown): ApiResponse<never> {
    if (error instanceof BusinessError) {
      return ResponseWrapper.error(error.code, error.message, error.details, error.field);
    }

    console.error(`Service error in ${this.tableName}:`, error);
    return ResponseWrapper.error(
      ErrorCode.INTERNAL_ERROR,
      '服务内部错误',
      error
    );
  }

  /**
   * 抛出业务异常
   */
  protected throwBusinessError(
    code: ErrorCode | string,
    message: string,
    details?: unknown,
    field?: string
  ): never {
    throw new BusinessError(code, message, details, field);
  }
}
