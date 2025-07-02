---
type: "always_apply"
---

# 测试开发规范

## 概述
本文档定义了易码网项目的测试驱动开发标准，包括TDD流程、单元测试规范、Mock 使用指南、测试质量标准等。

## 测试驱动开发(TDD)流程

### 1. 需求分析阶段
**目标**: 明确定义本次开发目标和验收标准

**具体步骤**:
- 明确要实现的具体页面和功能特性
- 定义清晰的验收标准和成功指标
- 识别核心业务逻辑和关键用户操作流程
- 确定测试范围和测试重点

### 2. 测试规划阶段
**目标**: 基于开发目标编写对应的测试用例

**单元测试规划**:
- 覆盖核心业务逻辑函数
- 覆盖数据处理和转换逻辑
- 覆盖错误处理和边界条件
- 覆盖API调用和数据库操作

**端到端(E2E)测试规划**:
- 覆盖用户关键操作流程
- 覆盖页面导航和交互
- 覆盖表单提交和数据验证
- 覆盖权限控制和安全检查

### 3. 开发实施阶段
**目标**: 按照测试用例进行实际开发工作

**TDD循环 - "红-绿-重构"**:
1. **红色阶段**: 编写失败的测试用例
   - 先写测试，确保测试失败（因为功能还未实现）
   - 测试用例应该清晰描述期望的行为
2. **绿色阶段**: 编写最少代码使测试通过
   - 实现最简单的代码让测试通过
   - 不追求完美，只求测试通过
3. **重构阶段**: 优化代码质量，保持测试通过
   - 改进代码结构和可读性
   - 消除重复代码
   - 确保所有测试仍然通过

### 4. 验证完成阶段
**目标**: 确保所有测试通过，作为开发完成的标准

**完成标准**:
- 所有单元测试通过
- 测试覆盖率达到 ≥ 80%
- 代码质量检查通过（ESLint、TypeScript编译）
- 功能符合原始需求和验收标准

### 5. 开发任务细化要求

**模块化开发**:
- 将大型开发任务拆分为小的、可独立测试的功能模块
- 每个模块应该有明确的输入、输出和职责
- 模块间依赖关系清晰，便于独立测试

**开发周期控制**:
- 每个功能模块的开发周期控制在合理范围内
- 避免长时间开发导致的问题积累
- 及时集成和测试，发现问题早期解决

**质量保证**:
- 测试用例应该具有良好的可读性和维护性
- 使用描述性的测试名称，清楚表达测试意图
- 保持测试代码的简洁和可理解性

## 1. 测试用例编写原则

### 1.1 AAA模式（Arrange-Act-Assert）
**规则**: 所有测试用例必须遵循AAA模式，确保测试结构清晰

```typescript
// ✅ 正确：遵循AAA模式
it('should handle insufficient credits', async () => {
  // Arrange - 准备测试数据
  const userId = 'user-123';
  const amount = 1000;
  const mockCredits = { available_credits: 500 };
  mockUserCredits(userId, mockCredits);

  // Act - 执行被测试的操作
  const result = spendUserCredits(userId, amount);

  // Assert - 验证结果
  await expect(result).rejects.toThrow('积分不足');
});

// ❌ 错误：混乱的测试结构
it('should handle credits', async () => {
  const result = await spendUserCredits('user-123', 1000);
  mockUserCredits('user-123', { available_credits: 500 });
  expect(result).rejects.toThrow();
});
```

### 1.2 测试行为而非实现
**规则**: 专注于验证业务行为和结果，而不是实现细节

```typescript
// ❌ 错误：测试实现细节
it('should call database correctly', async () => {
  await getUserCredits('user-123');

  expect(mockSupabase.from).toHaveBeenCalledWith('user_credits');
  expect(mockQuery.select).toHaveBeenCalledWith('*');
  expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
});

// ✅ 正确：测试业务行为
it('should return user credits when user exists', async () => {
  const mockCredits = { available_credits: 1000, total_credits: 1500 };
  mockUserCreditsResponse(mockCredits);

  const result = await getUserCredits('user-123');

  expect(result.available_credits).toBe(1000);
  expect(result.total_credits).toBe(1500);
});
```

### 1.3 描述性测试名称
**规则**: 测试名称应该清楚描述业务场景，而不是技术实现

```typescript
// ❌ 错误：技术性描述
it('should call RPC function')
it('should return data from database')
it('should handle errors')

// ✅ 正确：业务场景描述
it('should prevent duplicate purchases of the same project')
it('should return user credit balance for valid user')
it('should reject purchase when user has insufficient credits')
```

## 2. TypeScript 测试最佳实践

**规则**: 确保测试代码的类型安全和可维护性

```typescript
// ❌ 错误：使用 any 类型的 Mock
let mockSupabase: any;

// ✅ 正确：使用类型安全的 Mock 配置
import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// 使用 ESLint 注释允许必要的 any 类型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
  },
} as any as SupabaseClient;

// ✅ 更好：定义具体的 Mock 类型
interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  auth: {
    signUp: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
  };
}
```

## 3. Mock 使用指南

### 3.1 简化Mock配置原则
**规则**: Mock配置应该简单直接，避免过度复杂的配置

```typescript
// ❌ 错误：过度复杂的Mock配置
const queryPromise = Promise.resolve({ data: mockData, error: null });
const mockQuery = {
  select: vi.fn().mockReturnValue(queryPromise),
  eq: vi.fn().mockReturnValue(queryPromise),
  order: vi.fn().mockReturnValue(queryPromise),
};
(mockQuery as unknown as Promise<unknown>).then = queryPromise.then.bind(queryPromise);

// ✅ 正确：简单直接的Mock配置
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({
    data: mockData,
    error: null,
    count: mockData.length
  })
};
```

### 3.2 Vitest 和 Mock 配置规范

**规则**: 标准化的 Mock 配置模式

```typescript
// ✅ Supabase 查询链 Mock 配置
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockResolvedValue({
    data: mockData,
    error: null,
    count: mockData.length,
  }),
};

// ✅ RPC 调用 Mock 配置
(mockSupabase.rpc as any).mockResolvedValue({
  data: mockResult,
  error: null,
});

// ✅ 错误情况 Mock 配置
mockQuery.range.mockResolvedValue({
  data: null,
  error: new Error('Database error'),
  count: null,
});
```

### 3.3 Mock数据一致性
**规则**: Mock数据必须与实际API响应格式保持一致

```typescript
// ✅ 正确：与实际函数行为一致的Mock
it('should check if user purchased project', async () => {
  // 模拟找到已完成的订单
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: [{ id: 'order-123' }], // 返回数组表示找到订单
      error: null
    })
  };

  const result = await checkUserPurchased('buyer-123', 'project-123');
  expect(result).toBe(true); // 找到订单应返回true
});

// ❌ 错误：Mock与实际逻辑不符
it('should check purchase status', async () => {
  mockQuery.limit.mockResolvedValue({
    data: { id: 'order-123' }, // 错误：应该是数组
    error: null
  });

  const result = await checkUserPurchased('buyer-123', 'project-123');
  expect(result).toBe(false); // 错误：找到订单却期望false
});
```

## 4. 测试数据管理规范

### 4.1 测试数据工厂函数
**规则**: 创建可重用的测试数据工厂函数

```typescript
// ✅ 测试数据工厂函数
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    role: 'buyer',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test-project-id',
    title: 'Test Project',
    description: 'Test project description',
    price: 100,
    currency: 'CREDITS',
    seller_id: 'test-seller-id',
    category_id: 'test-category-id',
    status: 'approved',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ✅ Supabase 响应工厂函数
function createMockSupabaseResponse<T>(
  data: T | null,
  error: Error | null = null
) {
  return { data, error };
}
```

### 4.2 统一的Mock工具函数
**规则**: 使用统一的Mock工具函数，避免重复代码

```typescript
// ✅ 在tests/setup.ts中定义统一的工具函数
function createMockSupabaseResponse<T>(
  data: T | null,
  error: Error | null = null,
  count: number | null = null
) {
  return { data, error, count };
}

// ✅ 在测试中使用统一的工具函数
it('should create user successfully', async () => {
  const userData = createMockUser({ email: 'new@example.com' });
  const mockResponse = createMockSupabaseResponse(userData);

  mockSupabase.from.mockReturnValue({
    insert: vi.fn().mockResolvedValue(mockResponse)
  });

  const result = await createUser(userData);
  expect(result).toEqual(userData);
});
```

## 5. Mock 状态管理规范

**规则**: 确保测试间的隔离性

```typescript
describe('Projects API', () => {
  // ✅ 在每个测试前重置 Mock 状态
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ✅ 在测试套件结束后恢复原始实现
  afterAll(() => {
    vi.restoreAllMocks();
  });
});
```

## 6. 异步测试最佳实践

**规则**: 正确处理异步操作和错误

```typescript
// ✅ 正确的异步测试
it('should handle async operations', async () => {
  const mockData = createMockProject();
  mockSupabase.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockData)),
  });

  const result = await getProjectById('project-123');
  expect(result).toEqual(mockData);
});

// ✅ 正确的错误测试
it('should handle errors correctly', async () => {
  const mockError = new Error('Database error');
  mockSupabase.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
  });

  await expect(getProjectById('project-123')).rejects.toThrow('Database error');
});
```

## 7. 测试质量检查清单

### 7.1 测试完整性检查
- [ ] **正常流程测试**: 验证主要业务流程的正确执行
- [ ] **错误处理测试**: 验证各种异常情况的处理
- [ ] **边界条件测试**: 验证边界值和极端情况
- [ ] **业务规则测试**: 验证核心业务规则的执行

### 7.2 测试质量标准
- [ ] **测试名称描述性**: 能够清楚表达测试意图
- [ ] **Mock配置合理**: 简单直接，与实际行为一致
- [ ] **断言充分**: 验证所有重要的输出和副作用
- [ ] **测试隔离**: 测试之间相互独立，无依赖关系

### 7.3 覆盖率要求
- [ ] **语句覆盖率**: ≥ 80%
- [ ] **分支覆盖率**: ≥ 70%
- [ ] **函数覆盖率**: ≥ 85%
- [ ] **核心业务逻辑**: 100%覆盖
- [ ] **所有测试用例必须通过**: 作为开发完成的必要条件
- [ ] **测试可读性**: 测试名称清晰描述业务场景
- [ ] **测试维护性**: 测试代码结构清晰，易于修改和扩展

## 8. 常见反模式及避免方法

### 8.1 虚假测试用例
**反模式**: 为了提高覆盖率而编写的无效测试

```typescript
// ❌ 反模式：虚假测试
it('should call function', async () => {
  await someFunction();
  expect(someFunction).toHaveBeenCalled(); // 只验证调用，不验证结果
});

// ❌ 反模式：逻辑错误的测试
it('should return false when user purchased', async () => {
  mockReturnPurchaseData(); // Mock返回购买数据
  const result = await checkUserPurchased('user', 'project');
  expect(result).toBe(false); // 错误：有购买数据却期望false
});

// ✅ 正确：有意义的测试
it('should return true when user has completed purchase', async () => {
  mockCompletedOrder('user-123', 'project-123');

  const result = await checkUserPurchased('user-123', 'project-123');

  expect(result).toBe(true);
});
```

### 8.2 过度Mock
**反模式**: Mock配置比业务逻辑还复杂

```typescript
// ❌ 反模式：过度Mock
it('should fetch projects', async () => {
  const complexMockSetup = createComplexQueryChain()
    .withSelect()
    .withFilters()
    .withPagination()
    .withSorting()
    .build();

  // 50行的Mock配置代码...

  const result = await getProjects();
  expect(result).toBeDefined();
});

// ✅ 正确：简化Mock
it('should return paginated projects', async () => {
  const mockProjects = [createMockProject(), createMockProject()];
  mockProjectsQuery(mockProjects);

  const result = await getProjects({ page: 1, limit: 10 });

  expect(result.projects).toHaveLength(2);
  expect(result.total).toBe(2);
});
```

### 8.3 测试实现细节
**反模式**: 测试关注函数内部实现而不是外部行为

```typescript
// ❌ 反模式：测试实现细节
it('should use correct database queries', async () => {
  await getUserProfile('user-123');

  expect(mockSupabase.from).toHaveBeenCalledWith('users');
  expect(mockQuery.select).toHaveBeenCalledWith('id, username, email');
  expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user-123');
  expect(mockQuery.single).toHaveBeenCalled();
});

// ✅ 正确：测试业务行为
it('should return complete user profile for valid user', async () => {
  const mockUser = createMockUser({ id: 'user-123' });
  mockUserQuery(mockUser);

  const result = await getUserProfile('user-123');

  expect(result.id).toBe('user-123');
  expect(result.username).toBeDefined();
  expect(result.email).toBeDefined();
});
```

## 9. 测试开发工作流

### 9.1 完整的TDD开发周期

**第一步：需求分析和测试规划**
- [ ] 明确开发目标和功能需求
- [ ] 识别核心业务逻辑和关键操作流程
- [ ] 规划单元测试和E2E测试范围
- [ ] 定义验收标准和成功指标

**第二步：编写测试用例**
- [ ] 先编写失败的测试用例（红色阶段）
- [ ] 使用描述性的测试名称，清楚表达业务场景
- [ ] 覆盖正常流程、错误处理、边界条件
- [ ] 确保测试失败（因为功能还未实现）

**第三步：实现最小可行代码**
- [ ] 编写最少代码使测试通过（绿色阶段）
- [ ] 不追求完美实现，只求测试通过
- [ ] 验证所有测试用例通过

**第四步：重构和优化**
- [ ] 改进代码结构和可读性（重构阶段）
- [ ] 消除重复代码和代码异味
- [ ] 确保重构后所有测试仍然通过
- [ ] 检查测试覆盖率是否达标

**第五步：验证完成**
- [ ] 所有单元测试通过
- [ ] 测试覆盖率 ≥ 80%
- [ ] 代码质量检查通过
- [ ] 功能符合原始需求

### 9.2 测试编写最佳实践

**测试规划阶段**:
- [ ] 理解业务需求和用户场景
- [ ] 识别需要测试的核心功能点
- [ ] 设计测试数据和Mock策略
- [ ] 确定测试的输入、输出和预期行为

**测试编写阶段**:
- [ ] 使用AAA模式组织测试代码
- [ ] 编写描述性的测试名称
- [ ] 验证业务行为而不是实现细节
- [ ] 保持测试的独立性和可重复性

**测试维护阶段**:
- [ ] 定期审查和更新测试用例
- [ ] 重构测试代码，提高可读性
- [ ] 删除过时或无效的测试
- [ ] 确保测试与业务需求保持同步

## 10. 测试性能优化

### 10.1 测试执行优化
```typescript
// ✅ 使用beforeEach进行高效的测试设置
describe('User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCommonMocks();
  });

  // ✅ 避免不必要的异步操作
  it('should validate user data synchronously', () => {
    const userData = createMockUser({ email: 'invalid-email' });

    const errors = validateUserData(userData);

    expect(errors).toContain('邮箱格式不正确');
  });
});
```

### 10.2 Mock性能优化
```typescript
// ✅ 重用Mock配置
const createStandardMockQuery = (data: any) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue(createMockSupabaseResponse(data))
});

// ✅ 避免过度复杂的Mock
const mockUserService = {
  getUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn()
};
```
