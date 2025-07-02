---
type: "always_apply"
---

# 易码网 (Easy Code) 项目开发指导

## 项目概述
易码网是一个综合性源代码交易平台，提供双轨上架系统、一键部署、灵活支付适配器、积分系统等功能。

## 技术架构
- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **后端**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **部署**: Docker + Kubernetes
- **支付**: 多适配器支持 (支付宝、微信、Stripe等)
- **AI服务**: 本地工具集成

## 开发原则

### 1. 架构简化原则
- 初期将大部分服务集成到主应用中
- 仅分离部署编排器服务
- 延迟支付服务集成
- AI容器化手动处理

### 2. 数据库管理
- 使用 Supabase API 直接操作配置
- 先操作 → 调试 → 更新脚本
- 包含所有 RLS 策略修复
- 更新数据库设置脚本以简化未来部署

### 3. 开发流程
- **需求分析** → **架构设计** → **原型设计** → **编码实现**
- 所有文档统一放在 `docs/` 目录下，按类型分子目录
- 频繁使用 Playwright 进行应用测试
- 测试通过后才能进入下一个开发任务

### 4. 测试策略
- 每次编码后立即测试
- 使用 Playwright 进行端到端测试
- 我已经运行了开发服务器，访问地址是http://localhost:3000，除非你打开浏览器无法访问，否则不需要再次启动服务器
- 确保所有功能符合预期
- 测试未通过不允许进入下一任务

### 5. 代码质量
- 使用包管理器而非手动编辑配置文件
- 保持代码简洁和可维护性
- 编写单元测试和集成测试
- 提交代码前，必须运行build和lint命令，解决所有编译错误和告警
- 择机进行 Git 提交，避免积累过多改动，请务必记住，当前的改动未完成测试前，不允许提交。

### 6. TypeScript 类型安全规范

#### 6.1 禁用 any 类型规范
**规则**: 严格禁止使用 `any` 类型，使用具体类型或 `unknown` 类型
**ESLint规则**: `@typescript-eslint/no-explicit-any`

```typescript
// ❌ 错误做法
let mockSupabase: any;
function handleError(error: any): Response { }
const apiResponse: ApiResponse<any> = {};

// ✅ 正确做法
let mockSupabase: ReturnType<typeof vi.mocked>;
function handleError(error: unknown): Response { }
const apiResponse: ApiResponse<User> = {};

// ✅ 对于复杂场景，使用 unknown 并进行类型守卫
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'id' in data) {
    // 安全地处理数据
  }
}
```

**修复方法**:
1. 为测试 mock 对象使用 `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
2. 为错误处理使用 `unknown` 类型并添加类型检查
3. 为 API 响应定义具体的泛型类型

#### 6.2 泛型类型约束规范
**规则**: 正确使用泛型约束，避免类型不匹配错误

```typescript
// ❌ 错误：泛型类型不匹配
export abstract class BaseService<T = any> {
  async findById(id: string): Promise<ApiResponse<T>> {
    return ResponseWrapper.fromSupabase(response); // 类型不匹配
  }
}

// ✅ 正确：使用类型断言确保类型安全
export abstract class BaseService<T = unknown> {
  async findById(id: string): Promise<ApiResponse<T>> {
    return ResponseWrapper.fromSupabase(response) as ApiResponse<T>;
  }
}
```

#### 6.3 类型断言最佳实践
**规则**: 谨慎使用类型断言，优先使用类型守卫

```typescript
// ❌ 避免：直接类型断言
const user = data as User;

// ✅ 推荐：使用类型守卫
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data;
}

if (isUser(data)) {
  // data 现在是 User 类型
}

// ✅ 可接受：在确定类型安全的情况下使用断言
const result = ResponseWrapper.fromSupabase(response) as ApiResponse<T>;
```

#### 6.4 接口定义规范
**规则**: 为所有数据结构定义完整的 TypeScript 接口

```typescript
// ❌ 错误：缺少必需字段
const projectData = {
  title: 'New Project',
  description: 'Project description',
  price: 100,
  status: 'draft' as const,
};

// ✅ 正确：完整的接口定义
interface CreateProjectData {
  title: string;
  description: string;
  price: number;
  currency: string;
  seller_id: string;
  category_id: string;
  tech_stack: string[];
  is_dockerized: boolean;
  docker_verified: boolean;
  download_count: number;
  view_count: number;
  rating_average: number;
  rating_count: number;
  featured: boolean;
  status: ProjectStatus;
}
```

### 7. ESLint 代码质量规范

#### 7.1 未使用变量处理规范
**规则**: 正确处理未使用的变量和参数
**ESLint规则**: `@typescript-eslint/no-unused-vars`

```typescript
// ❌ 错误：未使用的导入和参数
import { updateProject, getSellerProjects } from '../projects';
function getCurrentUser(req: NextRequest): Promise<User | null> { }

// ✅ 正确：移除未使用的导入
import { getPublishedProjects } from '../projects';

// ✅ 正确：为故意未使用的参数添加下划线前缀
function getCurrentUser(_req: NextRequest): Promise<User | null> { }

// ✅ 正确：为抽象方法使用 ESLint 注释
// eslint-disable-next-line @typescript-eslint/no-unused-vars
protected async validateCreate(_data: Partial<T>): Promise<ApiResponse<void>> {
  return ResponseWrapper.success(undefined);
}
```

#### 7.2 导入管理规范
**规则**: 保持导入的整洁和必要性

```typescript
// ❌ 错误：导入未使用的模块
import { createClient } from '@/lib/supabase/client';
import { SupabaseClient, PostgrestQueryBuilder } from '@supabase/supabase-js';

// ✅ 正确：只导入需要的模块
import { supabase } from '@/lib/supabase';
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
```

#### 7.3 已弃用 API 替换规范
**规则**: 及时替换已弃用的 API

```typescript
// ❌ 错误：使用已弃用的 substr 方法
return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ✅ 正确：使用 substring 方法
return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
```

### 8. Supabase 集成规范

#### 8.1 客户端导入规范
**规则**: 使用统一的 Supabase 客户端导入方式

```typescript
// ❌ 错误：错误的导入路径
import { createClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server';

// ✅ 正确：统一的导入方式
import { supabase, createServerSupabaseClient } from '@/lib/supabase';
```

#### 8.2 错误处理模式规范
**规则**: 统一的 Supabase 错误处理模式

```typescript
// ❌ 错误：不一致的错误处理
if (response.error) {
  return ResponseWrapper.fromSupabase(response);
}

// ✅ 正确：统一的错误处理
if (response.error) {
  return ResponseWrapper.error(ErrorCode.DATABASE_ERROR, response.error.message);
}
```

#### 8.3 类型安全的查询规范
**规则**: 确保 Supabase 查询的类型安全

```typescript
// ❌ 错误：缺少类型信息
const response = await supabase.from('projects').select('*');
return ResponseWrapper.fromSupabase(response);

// ✅ 正确：明确的类型断言
const response = await supabase.from('projects').select('*');
return ResponseWrapper.fromSupabase(response) as ApiResponse<Project[]>;
```

### 9. 测试数据规范

#### 9.1 完整类型定义规范
**规则**: 测试数据必须符合完整的类型定义

```typescript
// ❌ 错误：缺少必需字段的测试数据
const projectData = {
  title: 'New Project',
  description: 'Project description',
  price: 100,
  status: 'draft' as const,
};

// ✅ 正确：完整的测试数据
const projectData = {
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

#### 9.2 Mock 对象处理规范
**规则**: 为复杂的 mock 对象使用适当的类型注解

```typescript
// ❌ 错误：无类型的 mock 对象
let mockSupabase: any;

// ✅ 正确：带有 ESLint 注释的 mock 对象
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSupabase: any;

// ✅ 更好：使用具体的 mock 类型
let mockSupabase: ReturnType<typeof vi.mocked>;
```

### 10. API 设计规范

#### 10.1 统一响应格式规范
**规则**: 所有 API 响应必须使用统一的 ResponseWrapper

```typescript
// ❌ 错误：直接返回数据
return { success: true, data: projects };

// ✅ 正确：使用 ResponseWrapper
return ResponseWrapper.success(projects);

// ✅ 正确：错误响应
return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '数据验证失败');
```

#### 10.2 中间件使用模式规范
**规则**: 正确组合和使用 API 中间件

```typescript
// ❌ 错误：类型不匹配的中间件参数
export const POST = withAuth(async (req: NextRequest, context?: any) => {
  // 处理逻辑
});

// ✅ 正确：明确的类型定义
export const POST = withAuth(async (req: NextRequest, context?: {
  params?: Record<string, string>;
  user?: AuthenticatedUser
}) => {
  // 处理逻辑
});
```

#### 10.3 错误处理统一化规范
**规则**: 使用统一的错误处理模式

```typescript
// ❌ 错误：不一致的错误处理
function handleApiError(error: any): NextResponse {
  if (error instanceof BusinessError) {
    return NextResponse.json(ResponseWrapper.error(error.code, error.message));
  }
  return NextResponse.json({ error: 'Unknown error' });
}

// ✅ 正确：统一的错误处理
function handleApiError(error: unknown): NextResponse {
  if (error instanceof BusinessError) {
    return NextResponse.json(
      ResponseWrapper.error(error.code, error.message, error.details, error.field)
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, error.message)
    );
  }

  return NextResponse.json(
    ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '未知错误')
  );
}
```

### 11. 自动化检查和验证

#### 11.1 必需的 npm scripts
确保 package.json 包含以下脚本：

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

#### 11.2 开发流程检查清单
**编码前**:
- [ ] 确认所需的 TypeScript 接口已定义
- [ ] 检查依赖包是否已安装
- [ ] 了解相关 API 的类型定义

**编码中**:
- [ ] 避免使用 `any` 类型
- [ ] 为所有变量和函数添加适当的类型注解
- [ ] 使用统一的错误处理模式
- [ ] 遵循导入和命名规范

**编码后**:
- [ ] 运行 `npm run lint` 检查代码质量
- [ ] 运行 `npm run build` 检查 TypeScript 编译
- [ ] 运行 `npm run test` 执行单元测试
- [ ] 解决所有错误和警告
- [ ] 进行功能测试验证

#### 11.3 CI/CD 配置建议
在 `.github/workflows/ci.yml` 中添加：

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm run test
```

### 12. 测试开发规范

#### 12.1 TypeScript 测试最佳实践

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

#### 12.2 Vitest 和 Mock 配置规范

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

#### 12.3 测试用例编写标准

**规则**: 遵循 AAA 模式（Arrange, Act, Assert）

```typescript
describe('getUserCredits', () => {
  it('should fetch user credits successfully', async () => {
    // Arrange - 准备测试数据和 Mock
    const mockCredits = { balance: 1000, currency: 'CREDITS' };
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockCredits,
        error: null,
      }),
    };
    (mockSupabase.from as any).mockReturnValue(mockQuery);

    // Act - 执行被测试的函数
    const result = await getUserCredits('user-123');

    // Assert - 验证结果
    expect(mockSupabase.from).toHaveBeenCalledWith('user_credits');
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(result).toEqual(mockCredits);
  });

  it('should handle database errors', async () => {
    // Arrange
    const mockError = new Error('Database connection failed');
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };
    (mockSupabase.from as any).mockReturnValue(mockQuery);

    // Act & Assert
    await expect(getUserCredits('user-123')).rejects.toThrow('Database connection failed');
  });
});
```

#### 12.4 测试数据管理规范

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

#### 12.5 Mock 状态管理规范

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

#### 12.6 异步测试最佳实践

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

### 13. 常见测试问题和解决方案

#### 13.1 Mock 配置错误诊断

**问题**: Mock 链式调用配置不正确
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
  limit: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockData)),
};
```

**问题**: RPC 调用 Mock 配置错误
```typescript
// ❌ 错误：类型不匹配
mockSupabase.rpc.mockResolvedValue(mockData);

// ✅ 解决方案：正确的类型断言
(mockSupabase.rpc as any).mockResolvedValue(createMockSupabaseResponse(mockData));
```

#### 13.2 函数实现与测试不匹配处理

**问题**: 函数返回格式与测试期望不符
```typescript
// 如果函数实际返回 { projects: [], total: 0 }
// 但测试期望直接返回数组

// ✅ 解决方案：调整测试期望
expect(result.projects).toEqual(mockProjects);
expect(result.total).toBe(mockProjects.length);
```

**问题**: 错误处理方式不一致
```typescript
// 如果函数不抛出错误，只记录日志
// ✅ 解决方案：调整测试断言
await expect(functionThatLogsErrors('id')).resolves.not.toThrow();
```

#### 13.3 测试覆盖率优化策略

**规则**: 系统性提升测试覆盖率

1. **优先覆盖核心业务逻辑**
   - 用户认证和授权
   - 项目管理 CRUD 操作
   - 积分系统交易
   - 订单处理流程

2. **测试用例类型分布**
   - 正常流程测试：60%
   - 错误处理测试：25%
   - 边界条件测试：15%

3. **覆盖率目标**
   - 语句覆盖率：≥ 80%
   - 分支覆盖率：≥ 70%
   - 函数覆盖率：≥ 85%

### 14. 测试开发检查清单

#### 14.1 编写测试前
- [ ] 确认函数的实际实现和返回格式
- [ ] 准备完整的测试数据工厂函数
- [ ] 了解函数的错误处理方式
- [ ] 确定需要 Mock 的外部依赖

#### 14.2 编写测试中
- [ ] 使用 AAA 模式组织测试代码
- [ ] 为每个测试用例添加描述性的名称
- [ ] 正确配置 Mock 对象和返回值
- [ ] 包含正常流程、错误处理、边界条件测试

#### 14.3 测试完成后
- [ ] 运行 `npm run test` 确保所有测试通过
- [ ] 检查测试覆盖率报告
- [ ] 验证 Mock 配置的正确性
- [ ] 确保测试间的隔离性

### 15. 常见问题和解决方案

#### 15.1 类型错误快速修复指南
1. **`any` 类型错误**: 替换为 `unknown` 或具体类型
2. **未使用变量错误**: 添加下划线前缀或移除未使用的代码
3. **导入路径错误**: 检查文件结构，使用正确的相对路径
4. **泛型类型不匹配**: 添加适当的类型断言
5. **接口字段缺失**: 补充完整的接口定义

#### 15.2 性能优化建议
1. **避免不必要的类型断言**: 优先使用类型守卫
2. **合理使用泛型约束**: 避免过度复杂的泛型定义
3. **统一错误处理**: 减少重复的错误处理代码
4. **优化导入**: 使用具体导入而非全量导入

## 目录结构
```
easy-code/
├── docs/                    # 项目文档
│   ├── requirements/        # 需求分析
│   ├── architecture/        # 架构设计
│   ├── prototypes/          # 原型设计
│   └── deployment/          # 部署文档
├── src/                     # 源代码
│   ├── lib/                 # 核心库
│   │   ├── api/            # API 相关
│   │   ├── services/       # 业务服务
│   │   └── __tests__/      # 单元测试
├── tests/                   # 集成测试
├── scripts/                 # 脚本文件
└── deployment/              # 部署配置
```

## Git 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

## Supabase 操作流程
1. 使用 Supabase API 直接操作
2. 进行调试和测试
3. 记录操作步骤
4. 更新对应脚本

## 部署策略
- Docker 容器化
- Kubernetes 编排
- 一键部署支持
- 环境配置管理

## 16. 代码质量保证流程

### 16.1 强制性检查流程
每次提交代码前必须通过以下检查：

```bash
# 1. 代码格式和质量检查
npm run lint

# 2. TypeScript 编译检查
npm run build

# 3. 单元测试检查
npm run test

# 4. 测试覆盖率检查
npm run test -- --coverage

# 5. 类型检查（可选）
npm run type-check
```

### 16.2 代码审查要点
1. **类型安全**: 检查是否有 `any` 类型使用
2. **错误处理**: 确保统一的错误处理模式
3. **测试覆盖**: 新功能必须包含相应测试，覆盖率≥80%
4. **文档更新**: API 变更需要更新相关文档
5. **性能影响**: 评估代码变更对性能的影响
6. **测试质量**: 检查测试用例的完整性和有效性

### 16.3 持续改进机制
1. **定期代码质量审查**: 每月进行代码质量分析
2. **规范更新**: 根据实际问题更新开发规范
3. **工具升级**: 及时更新 ESLint、TypeScript 等工具
4. **团队培训**: 定期进行代码质量培训
5. **测试策略优化**: 根据覆盖率报告优化测试策略

## 17. 单元测试规范

### 17.1 测试用例编写原则

#### 17.1.1 AAA模式（Arrange-Act-Assert）
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

#### 17.1.2 测试行为而非实现
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

#### 17.1.3 描述性测试名称
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

### 17.2 Mock使用指南

#### 17.2.1 简化Mock配置原则
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

#### 17.2.2 Mock数据一致性
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

#### 17.2.3 统一的Mock工具函数
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

### 17.3 测试质量检查清单

#### 17.3.1 测试完整性检查
- [ ] **正常流程测试**: 验证主要业务流程的正确执行
- [ ] **错误处理测试**: 验证各种异常情况的处理
- [ ] **边界条件测试**: 验证边界值和极端情况
- [ ] **业务规则测试**: 验证核心业务规则的执行

#### 17.3.2 测试质量标准
- [ ] **测试名称描述性**: 能够清楚表达测试意图
- [ ] **Mock配置合理**: 简单直接，与实际行为一致
- [ ] **断言充分**: 验证所有重要的输出和副作用
- [ ] **测试隔离**: 测试之间相互独立，无依赖关系

#### 17.3.3 覆盖率要求
- [ ] **语句覆盖率**: ≥ 80%
- [ ] **分支覆盖率**: ≥ 70%
- [ ] **函数覆盖率**: ≥ 85%
- [ ] **核心业务逻辑**: 100%覆盖

### 17.4 常见反模式及避免方法

#### 17.4.1 虚假测试用例
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

#### 17.4.2 过度Mock
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

#### 17.4.3 测试实现细节
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

### 17.5 测试开发工作流

#### 17.5.1 测试驱动开发(TDD)流程
1. **红色阶段**: 编写失败的测试用例
2. **绿色阶段**: 编写最少代码使测试通过
3. **重构阶段**: 优化代码质量，保持测试通过

#### 17.5.2 测试编写检查点
**编写前**:
- [ ] 理解函数的实际行为和返回格式
- [ ] 确定需要测试的业务场景
- [ ] 准备测试数据和Mock配置

**编写中**:
- [ ] 使用AAA模式组织测试代码
- [ ] 编写描述性的测试名称
- [ ] 验证业务行为而不是实现细节

**编写后**:
- [ ] 运行测试确保通过
- [ ] 检查测试覆盖率
- [ ] 验证Mock配置的正确性

### 17.6 测试性能优化

#### 17.6.1 测试执行优化
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

#### 17.6.2 Mock性能优化
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

## 18. 总结

本开发规范基于实际项目中遇到的 TypeScript 编译错误、ESLint 代码质量问题和测试开发挑战制定，涵盖了：

- **类型安全**: 禁用 `any` 类型，使用具体类型定义
- **代码质量**: 处理未使用变量，管理导入，替换已弃用 API
- **架构一致性**: 统一的 Supabase 集成和 API 设计模式
- **测试规范**: 完整的测试开发流程和 Mock 配置标准
- **测试质量**: 系统性的测试覆盖率提升策略和反模式避免
- **自动化检查**: 完整的 CI/CD 流程和检查清单

遵循这些规范可以显著提高代码质量，减少编译错误，提升开发效率，确保测试覆盖率达到生产级别要求，避免虚假测试用例，提升测试的真实价值。

## 注意事项
- 所有回复使用中文
- 遇到反复失败的命令时停下来让用户手动执行
- 善用可用工具
- 保持频繁的 Git 提交
- 项目未初始化时先进行仓库初始化
- **新增**: 每次编码后必须运行 `npm run lint` 和 `npm run build`
- **新增**: 所有类型错误和警告必须在提交前解决
- **新增**: 新功能开发必须包含相应的单元测试