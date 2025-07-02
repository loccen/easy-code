/**
 * 统一API响应格式系统单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ResponseWrapper,
  BusinessError,
  ErrorCode,
  PaginationMeta
} from '../response';
import { PostgrestError } from '@supabase/supabase-js';

describe('ResponseWrapper', () => {
  beforeEach(() => {
    // Mock Date.now and Math.random for consistent requestId generation
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2022-01-01T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('success', () => {
    it('should create successful response with data', () => {
      const testData = { id: 1, name: 'test' };
      const result = ResponseWrapper.success(testData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.meta?.timestamp).toBe('2022-01-01T00:00:00.000Z');
      expect(result.meta?.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should create successful response with custom meta', () => {
      const testData = { id: 1, name: 'test' };
      const customMeta = { total: 10 };
      const result = ResponseWrapper.success(testData, customMeta);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.meta?.timestamp).toBe('2022-01-01T00:00:00.000Z');
      expect(result.meta?.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(result.meta?.total).toBe(10);
    });

    it('should handle null data', () => {
      const result = ResponseWrapper.success(null);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle array data', () => {
      const testData = [{ id: 1 }, { id: 2 }];
      const result = ResponseWrapper.success(testData);
      expect(result.data).toEqual(testData);
    });
  });

  describe('error', () => {
    it('should create error response with basic info', () => {
      const result = ResponseWrapper.error(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.message).toBe('Validation failed');
      expect(result.error?.details).toBeUndefined();
      expect(result.error?.field).toBeUndefined();
      expect(result.meta?.timestamp).toBe('2022-01-01T00:00:00.000Z');
      expect(result.meta?.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should create error response with details and field', () => {
      const details = { originalError: 'Database constraint violation' };
      const result = ResponseWrapper.error(
        ErrorCode.DUPLICATE_RESOURCE,
        'Resource already exists',
        details,
        'email'
      );

      expect(result.error).toEqual({
        code: ErrorCode.DUPLICATE_RESOURCE,
        message: 'Resource already exists',
        details,
        field: 'email'
      });
    });

    it('should accept custom error codes', () => {
      const result = ResponseWrapper.error(
        'CUSTOM_ERROR',
        'Custom error message'
      );

      expect(result.error?.code).toBe('CUSTOM_ERROR');
    });
  });

  describe('paginated', () => {
    it('should create paginated response', () => {
      const testData = [{ id: 1 }, { id: 2 }];
      const pagination: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      };

      const result = ResponseWrapper.paginated(testData, pagination);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.meta?.timestamp).toBe('2022-01-01T00:00:00.000Z');
      expect(result.meta?.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(result.meta?.pagination).toEqual(pagination);
      expect(result.meta?.total).toBe(25);
    });

    it('should handle empty data array', () => {
      const pagination: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      };

      const result = ResponseWrapper.paginated([], pagination);
      expect(result.data).toEqual([]);
      expect(result.meta?.total).toBe(0);
    });
  });

  describe('fromSupabase', () => {
    it('should handle successful Supabase response', () => {
      const testData = { id: 1, name: 'test' };
      const supabaseResponse = {
        data: testData,
        error: null
      };

      const result = ResponseWrapper.fromSupabase(supabaseResponse);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });

    it('should handle Supabase response with count', () => {
      const testData = [{ id: 1 }, { id: 2 }];
      const supabaseResponse = {
        data: testData,
        error: null,
        count: 25
      };

      const result = ResponseWrapper.fromSupabase(supabaseResponse);
      expect(result.meta?.total).toBe(25);
    });

    it('should handle null data as not found', () => {
      const supabaseResponse = {
        data: null,
        error: null
      };

      const result = ResponseWrapper.fromSupabase(supabaseResponse);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.message).toBe('请求的资源不存在');
    });

    it('should transform data when transform function provided', () => {
      const testData = { id: 1, name: 'test' };
      const supabaseResponse = {
        data: testData,
        error: null
      };

      const transform = (data: typeof testData) => ({
        ...data,
        transformed: true
      });

      const result = ResponseWrapper.fromSupabase(supabaseResponse, { transform });
      expect(result.data).toEqual({
        id: 1,
        name: 'test',
        transformed: true
      });
    });

    it('should handle paginated Supabase response', () => {
      const testData = [{ id: 1 }, { id: 2 }];
      const supabaseResponse = {
        data: testData,
        error: null,
        count: 25
      };

      const pagination = {
        page: 2,
        limit: 10
      };

      const result = ResponseWrapper.fromSupabase(supabaseResponse, { pagination });

      expect(result.meta?.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      });
    });

    it('should handle RLS permission error', () => {
      const postgrestError: PostgrestError = {
        message: 'RLS policy violation',
        details: 'Row level security policy violation',
        hint: null,
        code: '42501'
      };

      const supabaseResponse = {
        data: null,
        error: postgrestError
      };

      const result = ResponseWrapper.fromSupabase(supabaseResponse);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.PERMISSION_DENIED);
      expect(result.error?.message).toBe('您没有权限执行此操作');
    });

    it('should handle unique constraint violation', () => {
      const postgrestError: PostgrestError = {
        message: 'duplicate key value violates unique constraint',
        details: 'Key (email)=(test@example.com) already exists.',
        hint: null,
        code: '23505'
      };

      const supabaseResponse = {
        data: null,
        error: postgrestError
      };

      const result = ResponseWrapper.fromSupabase(supabaseResponse);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.DUPLICATE_RESOURCE);
      expect(result.error?.message).toBe('资源已存在，请检查输入数据');
    });

    it('should handle foreign key constraint violation', () => {
      const postgrestError: PostgrestError = {
        message: 'insert or update on table violates foreign key constraint',
        details: 'Key (category_id)=(999) is not present in table "categories".',
        hint: null,
        code: '23503'
      };

      const supabaseResponse = {
        data: null,
        error: postgrestError
      };

      const result = ResponseWrapper.fromSupabase(supabaseResponse);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.message).toBe('关联的资源不存在');
    });

    it('should handle check constraint violation', () => {
      const postgrestError: PostgrestError = {
        message: 'new row for relation violates check constraint',
        details: 'Failing row contains invalid data.',
        hint: null,
        code: '23514'
      };

      const supabaseResponse = {
        data: null,
        error: postgrestError
      };

      const result = ResponseWrapper.fromSupabase(supabaseResponse);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.message).toBe('数据验证失败，请检查输入格式');
    });

    it('should handle generic database error', () => {
      const postgrestError: PostgrestError = {
        message: 'Generic database error',
        details: 'Something went wrong',
        hint: null,
        code: '99999'
      };

      const supabaseResponse = {
        data: null,
        error: postgrestError
      };

      const result = ResponseWrapper.fromSupabase(supabaseResponse);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(result.error?.message).toBe('Generic database error');
    });
  });
});

describe('BusinessError', () => {
  it('should create business error with all properties', () => {
    const details = { field: 'email', value: 'invalid' };
    const error = new BusinessError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid email format',
      details,
      'email'
    );

    expect(error.name).toBe('BusinessError');
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.message).toBe('Invalid email format');
    expect(error.details).toEqual(details);
    expect(error.field).toBe('email');
  });

  it('should create business error with minimal properties', () => {
    const error = new BusinessError(
      ErrorCode.BUSINESS_ERROR,
      'Business logic error'
    );

    expect(error.code).toBe(ErrorCode.BUSINESS_ERROR);
    expect(error.message).toBe('Business logic error');
    expect(error.details).toBeUndefined();
    expect(error.field).toBeUndefined();
  });

  it('should accept custom error codes', () => {
    const error = new BusinessError(
      'CUSTOM_BUSINESS_ERROR',
      'Custom business error'
    );

    expect(error.code).toBe('CUSTOM_BUSINESS_ERROR');
  });
});
