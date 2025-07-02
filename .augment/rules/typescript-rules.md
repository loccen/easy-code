---
type: "always_apply"
---

# TypeScript 类型安全开发规范

## 概述
本文档定义了易码网项目中 TypeScript 开发的类型安全规范，确保代码的类型安全性和可维护性。

## 1. 禁用 any 类型规范

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

## 2. 泛型类型约束规范

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

## 3. 类型断言最佳实践

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

## 4. 接口定义规范

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

## 5. 类型安全检查清单

### 编码前
- [ ] 确认所需的 TypeScript 接口已定义
- [ ] 检查依赖包是否已安装
- [ ] 了解相关 API 的类型定义

### 编码中
- [ ] 避免使用 `any` 类型
- [ ] 为所有变量和函数添加适当的类型注解
- [ ] 使用统一的错误处理模式
- [ ] 遵循导入和命名规范

### 编码后
- [ ] 运行 `npm run lint` 检查代码质量
- [ ] 运行 `npm run build` 检查 TypeScript 编译
- [ ] 运行 `npm run test` 执行单元测试
- [ ] 解决所有错误和警告
- [ ] 进行功能测试验证

## 6. 常见类型错误快速修复指南

1. **`any` 类型错误**: 替换为 `unknown` 或具体类型
2. **未使用变量错误**: 添加下划线前缀或移除未使用的代码
3. **导入路径错误**: 检查文件结构，使用正确的相对路径
4. **泛型类型不匹配**: 添加适当的类型断言
5. **接口字段缺失**: 补充完整的接口定义

## 7. 性能优化建议

1. **避免不必要的类型断言**: 优先使用类型守卫
2. **合理使用泛型约束**: 避免过度复杂的泛型定义
3. **统一错误处理**: 减少重复的错误处理代码
4. **优化导入**: 使用具体导入而非全量导入
