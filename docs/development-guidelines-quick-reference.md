# Easy Code 开发规范快速参考

## 🚀 开发前检查清单

### 必需工具检查
- [ ] Node.js 18+ 已安装
- [ ] npm 依赖已安装 (`npm install`)
- [ ] 环境变量已配置 (`.env.local`)
- [ ] Supabase 连接正常

### 代码质量工具
```bash
# 安装依赖
npm install

# 代码格式检查
npm run lint

# 自动修复格式问题
npm run lint:fix

# TypeScript 编译检查
npm run build

# 运行测试
npm run test
```

## ⚡ 常见错误快速修复

### 1. TypeScript 错误

#### `any` 类型错误
```typescript
// ❌ 错误
let data: any;

// ✅ 修复
let data: unknown;
// 或者
let data: User | null;
```

#### 泛型类型不匹配
```typescript
// ❌ 错误
return ResponseWrapper.fromSupabase(response);

// ✅ 修复
return ResponseWrapper.fromSupabase(response) as ApiResponse<T>;
```

#### 缺少接口字段
```typescript
// ❌ 错误
const projectData = {
  title: 'Test',
  price: 100
};

// ✅ 修复：添加所有必需字段
const projectData = {
  title: 'Test',
  description: 'Description',
  price: 100,
  currency: 'CREDITS',
  seller_id: 'seller-id',
  category_id: 'category-id',
  tech_stack: ['React'],
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

### 2. ESLint 错误

#### 未使用变量
```typescript
// ❌ 错误
import { updateProject, getSellerProjects } from '../projects';

// ✅ 修复：移除未使用的导入
import { getPublishedProjects } from '../projects';
```

#### 未使用参数
```typescript
// ❌ 错误
function handler(req: NextRequest) { }

// ✅ 修复：添加下划线前缀
function handler(_req: NextRequest) { }
```

### 3. Supabase 错误

#### 错误的导入路径
```typescript
// ❌ 错误
import { createClient } from '@/lib/supabase/client';

// ✅ 修复
import { supabase } from '@/lib/supabase';
```

#### 类型安全的查询
```typescript
// ❌ 错误
const response = await supabase.from('projects').select('*');
return ResponseWrapper.fromSupabase(response);

// ✅ 修复
const response = await supabase.from('projects').select('*');
return ResponseWrapper.fromSupabase(response) as ApiResponse<Project[]>;
```

## 🔧 开发工作流

### 1. 开始新功能
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 创建功能分支
git checkout -b feature/new-feature

# 3. 安装依赖（如有新增）
npm install
```

### 2. 编码过程
```bash
# 实时检查（开发时）
npm run lint

# 类型检查
npm run build
```

### 3. 提交前检查
```bash
# 完整检查流程
npm run lint && npm run build && npm run test
```

### 4. 提交代码
```bash
# 添加文件
git add .

# 提交（使用规范的提交信息）
git commit -m "feat: 添加新功能描述"

# 推送
git push origin feature/new-feature
```

## 📝 代码模板

### API 路由模板
```typescript
import { NextRequest } from 'next/server';
import { withAuth, withValidation } from '@/lib/api/middleware';
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';
import { z } from 'zod';

const schema = z.object({
  // 定义验证规则
});

export const POST = withAuth(
  withValidation(schema)(
    async (req: NextRequest, context?: { user?: AuthenticatedUser }) => {
      try {
        // 业务逻辑
        return ResponseWrapper.success(data);
      } catch (error) {
        return ResponseWrapper.error(ErrorCode.INTERNAL_ERROR, '操作失败');
      }
    }
  )
);
```

### Service 类模板
```typescript
import { BaseService } from './base.service';
import { ApiResponse } from '@/lib/api/response';

export class MyService extends BaseService<MyType> {
  constructor() {
    super('table_name');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected applySearch(query: any, search: string): any {
    return query.ilike('name', `%${search}%`);
  }
}
```

### 测试数据模板
```typescript
// 完整的测试数据
const mockData = {
  // 包含所有必需字段
  id: 'test-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // ... 其他字段
};

// Mock 对象
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSupabase: any;
```

## 🚨 紧急修复指南

### 构建失败
1. 检查 TypeScript 错误：`npm run build`
2. 检查 ESLint 错误：`npm run lint`
3. 检查依赖问题：`npm install`
4. 检查环境变量：确认 `.env.local` 配置

### 测试失败
1. 运行单个测试：`npm test -- specific-test.test.ts`
2. 查看测试覆盖率：`npm run test:coverage`
3. 更新测试快照：`npm test -- --update-snapshots`

### 类型错误
1. 清理 TypeScript 缓存：删除 `.next` 目录
2. 重新安装依赖：`rm -rf node_modules && npm install`
3. 检查类型定义文件：确认 `@types/*` 包版本

## 📚 相关文档
- [完整开发规范](../.augment/rules/easy-code-rules.md)
- [API 设计文档](./api-design.md)
- [数据库设计文档](./database-design.md)
- [部署指南](./deployment-guide.md)
