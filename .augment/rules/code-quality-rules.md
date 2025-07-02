---
type: "always_apply"
---

# 代码质量规范

## 概述
本文档定义了易码网项目的代码质量标准，包括 ESLint 规范、自动化检查和代码质量保证流程。

## 1. ESLint 代码质量规范

### 1.1 未使用变量处理规范
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

### 1.2 导入管理规范
**规则**: 保持导入的整洁和必要性

```typescript
// ❌ 错误：导入未使用的模块
import { createClient } from '@/lib/supabase/client';
import { SupabaseClient, PostgrestQueryBuilder } from '@supabase/supabase-js';

// ✅ 正确：只导入需要的模块
import { supabase } from '@/lib/supabase';
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
```

### 1.3 已弃用 API 替换规范
**规则**: 及时替换已弃用的 API

```typescript
// ❌ 错误：使用已弃用的 substr 方法
return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ✅ 正确：使用 substring 方法
return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
```

## 2. 自动化检查和验证

### 2.1 必需的 npm scripts
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

### 2.2 开发流程检查清单
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

### 2.3 CI/CD 配置建议
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

## 3. 代码质量保证流程

### 3.1 强制性检查流程
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

### 3.2 代码审查要点
1. **类型安全**: 检查是否有 `any` 类型使用
2. **错误处理**: 确保统一的错误处理模式
3. **测试覆盖**: 新功能必须包含相应测试，覆盖率≥80%
4. **文档更新**: API 变更需要更新相关文档
5. **性能影响**: 评估代码变更对性能的影响
6. **测试质量**: 检查测试用例的完整性和有效性

### 3.3 持续改进机制
1. **定期代码质量审查**: 每月进行代码质量分析
2. **规范更新**: 根据实际问题更新开发规范
3. **工具升级**: 及时更新 ESLint、TypeScript 等工具
4. **团队培训**: 定期进行代码质量培训
5. **测试策略优化**: 根据覆盖率报告优化测试策略

## 4. 质量指标和目标

### 4.1 代码质量指标
- **ESLint 错误**: 0 个
- **ESLint 警告**: ≤ 5 个
- **TypeScript 编译错误**: 0 个
- **测试覆盖率**: ≥ 80%
- **构建成功率**: 100%

### 4.2 性能指标
- **构建时间**: ≤ 2 分钟
- **测试执行时间**: ≤ 30 秒
- **Lint 检查时间**: ≤ 10 秒

## 5. 工具配置

### 5.1 ESLint 配置要点
- 启用 TypeScript 相关规则
- 禁用 `any` 类型使用
- 强制导入排序
- 检查未使用变量

### 5.2 Prettier 配置
- 统一代码格式
- 自动格式化
- 与 ESLint 集成

### 5.3 Husky 预提交钩子
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test"
    }
  }
}
```
