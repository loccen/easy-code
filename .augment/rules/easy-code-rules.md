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

### 12. 常见问题和解决方案

#### 12.1 类型错误快速修复指南
1. **`any` 类型错误**: 替换为 `unknown` 或具体类型
2. **未使用变量错误**: 添加下划线前缀或移除未使用的代码
3. **导入路径错误**: 检查文件结构，使用正确的相对路径
4. **泛型类型不匹配**: 添加适当的类型断言
5. **接口字段缺失**: 补充完整的接口定义

#### 12.2 性能优化建议
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

## 13. 代码质量保证流程

### 13.1 强制性检查流程
每次提交代码前必须通过以下检查：

```bash
# 1. 代码格式和质量检查
npm run lint

# 2. TypeScript 编译检查
npm run build

# 3. 单元测试检查
npm run test

# 4. 类型检查（可选）
npm run type-check
```

### 13.2 代码审查要点
1. **类型安全**: 检查是否有 `any` 类型使用
2. **错误处理**: 确保统一的错误处理模式
3. **测试覆盖**: 新功能必须包含相应测试
4. **文档更新**: API 变更需要更新相关文档
5. **性能影响**: 评估代码变更对性能的影响

### 13.3 持续改进机制
1. **定期代码质量审查**: 每月进行代码质量分析
2. **规范更新**: 根据实际问题更新开发规范
3. **工具升级**: 及时更新 ESLint、TypeScript 等工具
4. **团队培训**: 定期进行代码质量培训

## 14. 总结

本开发规范基于实际项目中遇到的 TypeScript 编译错误和 ESLint 代码质量问题制定，涵盖了：

- **类型安全**: 禁用 `any` 类型，使用具体类型定义
- **代码质量**: 处理未使用变量，管理导入，替换已弃用 API
- **架构一致性**: 统一的 Supabase 集成和 API 设计模式
- **测试规范**: 完整的类型定义和 mock 对象处理
- **自动化检查**: 完整的 CI/CD 流程和检查清单

遵循这些规范可以显著提高代码质量，减少编译错误，提升开发效率。

## 注意事项
- 所有回复使用中文
- 遇到反复失败的命令时停下来让用户手动执行
- 善用可用工具
- 保持频繁的 Git 提交
- 项目未初始化时先进行仓库初始化
- **新增**: 每次编码后必须运行 `npm run lint` 和 `npm run build`
- **新增**: 所有类型错误和警告必须在提交前解决
- **新增**: 新功能开发必须包含相应的单元测试