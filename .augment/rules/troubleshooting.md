---
type: "always_apply"
---

# 常见问题和解决方案

## 概述
本文档收集了易码网项目开发过程中的常见问题和对应的解决方案，帮助开发者快速定位和解决问题。

## 1. TypeScript 类型错误

### 1.1 `any` 类型错误
**问题**: ESLint 报告 `@typescript-eslint/no-explicit-any` 错误

**解决方案**:
```typescript
// ❌ 错误
let mockSupabase: any;

// ✅ 解决方案1：使用具体类型
let mockSupabase: ReturnType<typeof vi.mocked>;

// ✅ 解决方案2：使用 ESLint 注释（仅在必要时）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSupabase: any;

// ✅ 解决方案3：使用 unknown 类型
function handleError(error: unknown): Response {
  if (error instanceof Error) {
    return new Response(error.message);
  }
  return new Response('Unknown error');
}
```

### 1.2 泛型类型不匹配
**问题**: 泛型类型参数不匹配导致编译错误

**解决方案**:
```typescript
// ❌ 错误
export abstract class BaseService<T = any> {
  async findById(id: string): Promise<ApiResponse<T>> {
    return ResponseWrapper.fromSupabase(response); // 类型不匹配
  }
}

// ✅ 解决方案：使用类型断言
export abstract class BaseService<T = unknown> {
  async findById(id: string): Promise<ApiResponse<T>> {
    return ResponseWrapper.fromSupabase(response) as ApiResponse<T>;
  }
}
```

### 1.3 接口字段缺失
**问题**: 对象缺少接口要求的必需字段

**解决方案**:
```typescript
// ❌ 错误：缺少必需字段
const projectData = {
  title: 'New Project',
  description: 'Project description',
  price: 100,
  status: 'draft' as const,
};

// ✅ 解决方案：补充完整字段
const projectData: CreateProjectData = {
  title: 'New Project',
  description: 'Project description',
  price: 100,
  currency: 'CREDITS',
  seller_id: 'seller-id',
  category_id: 'category-id',
  tech_stack: ['React', 'TypeScript'],
  is_dockerized: false,
  docker_verified: false,
  download_count: 0,
  view_count: 0,
  rating_average: 0,
  rating_count: 0,
  featured: false,
  status: 'draft' as const,
};
```

## 2. ESLint 代码质量问题

### 2.1 未使用变量错误
**问题**: `@typescript-eslint/no-unused-vars` 错误

**解决方案**:
```typescript
// ❌ 错误：未使用的导入
import { updateProject, getSellerProjects } from '../projects';

// ✅ 解决方案1：移除未使用的导入
import { getPublishedProjects } from '../projects';

// ✅ 解决方案2：为故意未使用的参数添加下划线前缀
function getCurrentUser(_req: NextRequest): Promise<User | null> {
  // 实现逻辑
}

// ✅ 解决方案3：使用 ESLint 注释（抽象方法）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
protected async validateCreate(_data: Partial<T>): Promise<ApiResponse<void>> {
  return ResponseWrapper.success(undefined);
}
```

### 2.2 已弃用 API 使用
**问题**: 使用已弃用的 `substr` 方法

**解决方案**:
```typescript
// ❌ 错误：使用已弃用的 substr
return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ✅ 解决方案：使用 substring
return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
```

## 3. Supabase 集成问题

### 3.1 客户端导入错误
**问题**: 错误的 Supabase 客户端导入路径

**解决方案**:
```typescript
// ❌ 错误：错误的导入路径
import { createClient } from '@/lib/supabase/client';

// ✅ 解决方案：使用统一的导入方式
import { supabase } from '@/lib/supabase';
```

### 3.2 类型安全查询问题
**问题**: Supabase 查询缺少类型信息

**解决方案**:
```typescript
// ❌ 错误：缺少类型信息
const response = await supabase.from('projects').select('*');
return ResponseWrapper.fromSupabase(response);

// ✅ 解决方案：明确的类型断言
const response = await supabase.from('projects').select('*');
return ResponseWrapper.fromSupabase(response) as ApiResponse<Project[]>;
```

## 4. 测试相关问题

### 4.1 Mock 配置错误
**问题**: Mock 链式调用配置不正确

**解决方案**:
```typescript
// ❌ 错误：Mock 链不完整
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  // 缺少最终的解析方法
};

// ✅ 解决方案：完整的 Mock 链
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({
    data: mockData,
    error: null,
    count: mockData.length
  }),
};
```

### 4.2 RPC 调用 Mock 错误
**问题**: RPC 调用 Mock 配置类型不匹配

**解决方案**:
```typescript
// ❌ 错误：类型不匹配
mockSupabase.rpc.mockResolvedValue(mockData);

// ✅ 解决方案：正确的类型断言
(mockSupabase.rpc as any).mockResolvedValue({
  data: mockData,
  error: null
});
```

### 4.3 测试期望与实现不符
**问题**: 函数返回格式与测试期望不符

**解决方案**:
```typescript
// 如果函数实际返回 { projects: [], total: 0 }
// 但测试期望直接返回数组

// ✅ 解决方案：调整测试期望
expect(result.projects).toEqual(mockProjects);
expect(result.total).toBe(mockProjects.length);

// 如果函数不抛出错误，只记录日志
// ✅ 解决方案：调整测试断言
await expect(functionThatLogsErrors('id')).resolves.not.toThrow();
```

## 5. 构建和部署问题

### 5.1 构建失败
**问题**: `npm run build` 失败

**诊断步骤**:
1. 检查 TypeScript 编译错误：`npm run type-check`
2. 检查 ESLint 错误：`npm run lint`
3. 检查依赖安装：`npm ci`
4. 清理缓存：`rm -rf .next && npm run build`

### 5.2 测试失败
**问题**: `npm run test` 失败

**诊断步骤**:
1. 检查 Mock 配置是否正确
2. 验证测试数据是否完整
3. 确认异步操作是否正确处理
4. 检查测试隔离性

## 6. 性能优化建议

### 6.1 TypeScript 编译优化
- 使用增量编译：`tsc --incremental`
- 优化 tsconfig.json 配置
- 减少不必要的类型断言

### 6.2 测试性能优化
- 使用 `beforeEach` 进行高效的测试设置
- 避免不必要的异步操作
- 重用 Mock 配置

### 6.3 构建性能优化
- 使用 Next.js Turbopack：`next dev --turbopack`
- 优化依赖导入
- 启用代码分割

## 7. 调试技巧

### 7.1 TypeScript 调试
```typescript
// 使用类型断言进行调试
const debugType = (value: unknown) => {
  console.log('Type:', typeof value);
  console.log('Value:', value);
  return value;
};
```

### 7.2 测试调试
```typescript
// 在测试中添加调试信息
it('should debug test', async () => {
  console.log('Mock calls:', mockFunction.mock.calls);
  console.log('Mock results:', mockFunction.mock.results);
});
```

### 7.3 Supabase 调试
```typescript
// 启用 Supabase 调试模式
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
});
```

## 8. 快速修复清单

### 8.1 编译错误修复
- [ ] 替换 `any` 类型为具体类型或 `unknown`
- [ ] 添加缺失的接口字段
- [ ] 修复导入路径错误
- [ ] 添加适当的类型断言

### 8.2 ESLint 错误修复
- [ ] 移除未使用的导入和变量
- [ ] 为故意未使用的参数添加下划线前缀
- [ ] 替换已弃用的 API
- [ ] 添加必要的 ESLint 注释

### 8.3 测试错误修复
- [ ] 完善 Mock 配置
- [ ] 调整测试期望与实际行为一致
- [ ] 确保测试数据完整性
- [ ] 验证异步操作处理
