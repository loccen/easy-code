/**
 * 测试环境设置
 */

import { vi } from 'vitest';

// 在测试期间静默预期的错误日志
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  // 过滤掉测试中的预期错误日志
  if (
    message.includes('失败:') ||
    message.includes('错误:') ||
    message.includes('获取') ||
    message.includes('创建') ||
    message.includes('更新') ||
    message.includes('删除')
  ) {
    return; // 不输出这些预期的错误日志
  }
  originalConsoleError(...args);
};

// Mock环境变量
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock Supabase客户端
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      rangeGt: vi.fn().mockReturnThis(),
      rangeGte: vi.fn().mockReturnThis(),
      rangeLt: vi.fn().mockReturnThis(),
      rangeLte: vi.fn().mockReturnThis(),
      rangeAdjacent: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      csv: vi.fn(),
      geojson: vi.fn(),
      explain: vi.fn(),
      rollback: vi.fn(),
      returns: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
        getPublicUrl: vi.fn(),
        createSignedUrl: vi.fn(),
        createSignedUrls: vi.fn(),
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

// Mock Next.js相关
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));

// Mock window对象
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// 全局测试工具函数
global.createMockSupabaseResponse = (data: any, error: any = null, count: number | null = null) => ({
  data,
  error,
  count,
});

global.createMockUser = (overrides: any = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  role: 'buyer',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

global.createMockProject = (overrides: any = {}) => ({
  id: 'test-project-id',
  title: 'Test Project',
  description: 'Test project description',
  price: 100,
  seller_id: 'test-seller-id',
  category_id: 'test-category-id',
  status: 'approved',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// 类型声明
declare global {
  function createMockSupabaseResponse(data: any, error?: any, count?: number | null): any;
  function createMockUser(overrides?: any): any;
  function createMockProject(overrides?: any): any;
}
