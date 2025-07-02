/**
 * API中间件测试辅助工具
 */

import { vi, expect } from 'vitest';
import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

/**
 * 创建Mock的NextRequest对象
 */
export function createMockRequest(options: {
  url?: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
} = {}): NextRequest {
  const {
    url = 'http://localhost:3000/api/test',
    method = 'GET',
    body = null,
    headers = {},
  } = options;

  const mockRequest = {
    url,
    method,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    clone: vi.fn().mockReturnThis(),
  } as unknown as NextRequest;

  return mockRequest;
}

/**
 * 创建Mock的NextResponse
 */
export function createMockNextResponse() {
  const mockResponse = {
    json: vi.fn((data: unknown, init?: ResponseInit) => ({
      data,
      status: init?.status || 200,
      headers: init?.headers || {},
      ok: (init?.status || 200) < 400,
    })),
  };

  return mockResponse;
}

/**
 * 创建Mock的Supabase用户
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: '2023-01-01T00:00:00Z',
    phone: '',
    confirmed_at: '2023-01-01T00:00:00Z',
    last_sign_in_at: '2023-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * 创建Mock的用户Profile
 */
export function createMockUserProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
    status: 'active',
    ...overrides,
  };
}

/**
 * 创建Mock的Supabase客户端
 */
export function createMockSupabaseClient(options: {
  user?: User | null;
  userProfile?: Record<string, unknown> | null;
  authError?: Error | null;
  profileError?: Error | null;
} = {}) {
  const {
    user = null,
    userProfile = null,
    authError = null,
    profileError = null,
  } = options;

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: userProfile,
        error: profileError,
      }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      // 添加Promise接口以支持直接await
      then: vi.fn((resolve) => resolve({ data: [], error: null, count: 0 })),
    })),
  };

  return mockClient;
}

/**
 * 验证API响应格式
 */
interface ApiResponseLike {
  success: boolean;
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export function expectApiResponse(response: ApiResponseLike, expected: {
  success: boolean;
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
}) {
  expect(response).toHaveProperty('success', expected.success);
  
  if (expected.success) {
    expect(response).toHaveProperty('data');
    if (expected.data !== undefined) {
      expect(response.data).toEqual(expected.data);
    }
  } else {
    expect(response).toHaveProperty('error');
    if (expected.error?.code) {
      expect(response.error.code).toBe(expected.error.code);
    }
    if (expected.error?.message) {
      expect(response.error.message).toBe(expected.error.message);
    }
  }
  
  expect(response).toHaveProperty('meta');
  expect(response.meta).toHaveProperty('timestamp');
  expect(response.meta).toHaveProperty('requestId');
}

/**
 * 创建测试用的API Handler
 */
export function createTestHandler(returnValue: unknown = { success: true, data: 'test' }) {
  return vi.fn().mockResolvedValue(returnValue);
}

/**
 * 创建会抛出错误的API Handler
 */
export function createErrorHandler(error: Error) {
  return vi.fn().mockRejectedValue(error);
}

/**
 * 验证HTTP状态码
 */
export function expectHttpStatus(response: { status: number }, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
}

/**
 * 创建Zod验证错误
 */
interface ZodErrorLike extends Error {
  issues: Array<{ path: string[]; message: string; code: string }>;
  name: string;
}

export function createZodError(issues: Array<{ path: string[]; message: string; code: string }>): ZodErrorLike {
  const error = new Error('Validation failed') as ZodErrorLike;
  error.issues = issues;
  error.name = 'ZodError';
  return error;
}

/**
 * 测试中间件组合
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type MiddlewareFunction = (handler: Function) => Function;

export async function testMiddlewareComposition(
  middlewares: Array<MiddlewareFunction>,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  handler: Function,
  request: NextRequest,
  context?: unknown
) {
  const composedHandler = middlewares.reduceRight(
    (acc, middleware) => middleware(acc),
    handler
  );
  
  return await composedHandler(request, context);
}

/**
 * 验证中间件调用链
 */
export function expectMiddlewareChain(
  mocks: Array<{ mock: ReturnType<typeof vi.fn>; expectedCalls: number }>,
  message?: string
) {
  mocks.forEach(({ mock, expectedCalls }, index) => {
    expect(mock).toHaveBeenCalledTimes(expectedCalls);
    if (message) {
      expect(mock, `${message} - middleware ${index}`).toHaveBeenCalledTimes(expectedCalls);
    }
  });
}
