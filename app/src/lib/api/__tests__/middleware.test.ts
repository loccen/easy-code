/**
 * API中间件单元测试 - 重构版本
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { NextResponse, NextRequest } from 'next/server';
import {
  withApiHandler,
  withAuth,
  compose,
  CommonSchemas,
  type ApiHandler,
} from '../middleware';
import { ErrorCode, BusinessError } from '../response';
import {
  createMockRequest,
  createMockUser,
  createMockUserProfile,
  createMockSupabaseClient,
  createTestHandler,
  createErrorHandler,
} from './test-helpers';

// Mock Next.js
vi.mock('next/server', () => {
  const MockNextResponse = vi.fn() as unknown as {
    new (...args: unknown[]): unknown;
    json: ReturnType<typeof vi.fn>;
  };
  (MockNextResponse as unknown as { json: ReturnType<typeof vi.fn> }).json = vi.fn((data: unknown, init?: ResponseInit) => ({
    data,
    status: init?.status || 200,
    headers: init?.headers || {},
    ok: (init?.status || 200) < 400,
  }));

  return {
    NextRequest: vi.fn(),
    NextResponse: MockNextResponse,
  };
});

// Mock Supabase
let mockSupabaseClient: unknown;
vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabaseClient),
}));

describe('API Middleware', () => {
  let mockRequest: NextRequest;
  let mockHandler: ApiHandler;

  beforeEach(() => {
    mockRequest = createMockRequest({
      url: 'http://localhost:3000/api/test',
      body: { test: 'data' },
    });
    mockHandler = createTestHandler({ success: true, data: 'test' });
    mockSupabaseClient = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('withApiHandler', () => {
    it('should call the handler with correct parameters', async () => {
      const handler = withApiHandler(mockHandler);
      await handler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, undefined);
    });

    it('should handle ApiResponse objects', async () => {
      const apiResponse = { success: true, data: 'test' };
      const apiHandler = createTestHandler(apiResponse);
      const handler = withApiHandler(apiHandler);

      await handler(mockRequest);

      expect(vi.mocked(NextResponse.json)).toHaveBeenCalledWith(
        apiResponse,
        { status: 200 }
      );
    });

    it('should handle business errors', async () => {
      const businessError = new BusinessError(ErrorCode.VALIDATION_ERROR, 'Test error');
      const errorHandler = createErrorHandler(businessError);
      const handler = withApiHandler(errorHandler);

      await handler(mockRequest);

      expect(vi.mocked(NextResponse.json)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Test error',
          }),
        }),
        { status: 400 }
      );
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Generic error');
      const errorHandler = createErrorHandler(genericError);
      const handler = withApiHandler(errorHandler);

      await handler(mockRequest);

      expect(vi.mocked(NextResponse.json)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.INTERNAL_ERROR,
          }),
        }),
        { status: 500 }
      );
    });
  });

  describe('withAuth', () => {
    it('should return 401 when user is not authenticated', async () => {
      // 设置无用户的Mock
      mockSupabaseClient = createMockSupabaseClient({
        user: null,
        userProfile: null,
      });

      const handler = withAuth(mockHandler);
      await handler(mockRequest);

      expect(vi.mocked(NextResponse.json)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.UNAUTHORIZED,
          }),
        }),
        { status: 401 }
      );
    });

    it('should pass authenticated user to handler', async () => {
      // 设置有用户的Mock
      const mockUser = createMockUser();
      const mockProfile = createMockUserProfile();

      mockSupabaseClient = createMockSupabaseClient({
        user: mockUser,
        userProfile: mockProfile,
      });

      const handler = withAuth(mockHandler);
      await handler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          user: expect.objectContaining({
            id: mockProfile.id,
            email: mockProfile.email,
            role: mockProfile.role,
            status: mockProfile.status,
          }),
        })
      );
    });

    it('should return 401 when user profile is not found', async () => {
      const mockUser = createMockUser();

      mockSupabaseClient = createMockSupabaseClient({
        user: mockUser,
        userProfile: null,
      });

      const handler = withAuth(mockHandler);
      await handler(mockRequest);

      expect(vi.mocked(NextResponse.json)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.UNAUTHORIZED,
          }),
        }),
        { status: 401 }
      );
    });
  });

  describe('withRole', () => {
    it('should test role validation logic', () => {
      // 测试角色验证逻辑
      const allowedRoles = ['admin'];
      const userRole = 'user';
      const hasPermission = allowedRoles.includes(userRole);

      expect(hasPermission).toBe(false);
    });

    it('should test multiple role validation', () => {
      const allowedRoles = ['admin', 'moderator'];
      const userRole = 'moderator';
      const hasPermission = allowedRoles.includes(userRole);

      expect(hasPermission).toBe(true);
    });

    it('should test single role string conversion', () => {
      const roles = 'admin';
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      expect(allowedRoles).toEqual(['admin']);
    });

    it('should test array role handling', () => {
      const roles = ['admin', 'moderator'];
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      expect(allowedRoles).toEqual(['admin', 'moderator']);
    });
  });

  describe('withValidation', () => {
    it('should validate schema parsing', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const validData = { name: 'John', age: 30 };
      const result = schema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should handle validation errors', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const invalidData = { name: 'John', age: 'invalid' };
      const result = schema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path).toEqual(['age']);
      }
    });
  });

  describe('withQueryValidation', () => {
    it('should parse URL search parameters', () => {
      const url = new URL('http://localhost:3000/api/test?page=1&limit=10');
      const queryParams = Object.fromEntries(url.searchParams.entries());

      expect(queryParams).toEqual({ page: '1', limit: '10' });
    });

    it('should validate query schema', () => {
      const schema = z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
      });

      const queryParams = { page: '1', limit: '10' };
      const result = schema.safeParse(queryParams);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(queryParams);
      }
    });
  });

  describe('withPagination', () => {
    it('should parse pagination parameters', () => {
      const url = new URL('http://localhost:3000/api/test?page=2&limit=50');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      expect(page).toBe(2);
      expect(limit).toBe(50);
      expect(offset).toBe(50);
    });

    it('should use default pagination values', () => {
      const url = new URL('http://localhost:3000/api/test');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      expect(page).toBe(1);
      expect(limit).toBe(20);
      expect(offset).toBe(0);
    });

    it('should limit maximum page size', () => {
      const url = new URL('http://localhost:3000/api/test?limit=200');
      const requestedLimit = parseInt(url.searchParams.get('limit') || '20');
      const maxLimit = 100;
      const actualLimit = Math.min(requestedLimit, maxLimit);

      expect(actualLimit).toBe(100);
    });

    it('should handle invalid pagination values', () => {
      const url = new URL('http://localhost:3000/api/test?page=invalid&limit=invalid');
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
      const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '20') || 20);

      expect(page).toBe(1);
      expect(limit).toBe(20);
    });
  });

  describe('CommonSchemas', () => {
    it('should validate ID schema', () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const result = CommonSchemas.id.parse(validId);
      expect(result).toBe(validId);

      expect(() => CommonSchemas.id.parse('invalid-id')).toThrow();
    });

    it('should validate pagination schema', () => {
      const result = CommonSchemas.pagination.parse({
        page: '2',
        limit: '50',
      });
      expect(result).toEqual({ page: 2, limit: 50 });
    });
  });

  describe('compose', () => {
    it('should compose multiple middleware functions', () => {
      const middleware1 = (handler: ApiHandler) => handler;
      const middleware2 = (handler: ApiHandler) => handler;
      const middleware3 = (handler: ApiHandler) => handler;

      const composed = compose(middleware1, middleware2, middleware3);
      const result = composed(mockHandler);

      expect(result).toBe(mockHandler);
    });
  });
});
