# Easy Code 测试指南

## 概述

本项目采用多层次的测试策略，确保代码质量和功能稳定性：

- **单元测试**: 使用 Vitest 测试核心业务逻辑
- **集成测试**: 测试 API 路由和数据库交互
- **端到端测试**: 使用 Playwright 测试完整用户流程

## 快速开始

### 运行所有测试
```bash
# 使用测试脚本（推荐）
./scripts/run-tests.sh

# 或使用 npm 命令
npm run test:all
```

### 运行特定类型的测试
```bash
# 只运行单元测试
npm run test:unit

# 运行单元测试并生成覆盖率报告
npm run test:unit:coverage

# 只运行 E2E 测试
npm run test:e2e

# 快速测试模式（单元测试 + 简化 E2E）
npm run test:quick
```

## 测试脚本使用

项目提供了 `scripts/run-tests.sh` 脚本来简化测试运行：

```bash
# 快速测试模式
./scripts/run-tests.sh --quick

# CI 完整测试
./scripts/run-tests.sh --ci

# 生成覆盖率报告
./scripts/run-tests.sh --coverage

# 只运行单元测试
./scripts/run-tests.sh --unit

# 只运行 E2E 测试
./scripts/run-tests.sh --e2e

# 设置测试环境
./scripts/run-tests.sh --setup

# 清理测试数据
./scripts/run-tests.sh --cleanup
```

## 测试环境配置

### 环境变量

测试需要以下环境变量：

```bash
# .env.test.local
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
```

### 测试数据管理

使用测试数据管理工具：

```bash
# 设置完整测试环境
npm run test:data setup

# 清理所有测试数据
npm run test:data cleanup

# 验证测试环境状态
npm run test:data verify

# 只创建测试用户
npm run test:data users

# 只创建测试分类
npm run test:data categories

# 只创建测试项目
npm run test:data projects
```

## 测试覆盖率

### 覆盖率目标

- **整体覆盖率**: ≥ 80%
- **函数覆盖率**: ≥ 70%
- **分支覆盖率**: ≥ 70%
- **语句覆盖率**: ≥ 80%

### 查看覆盖率报告

```bash
# 生成并查看覆盖率报告
npm run test:unit:coverage

# 覆盖率报告位置
open coverage/index.html
```

## 性能优化

### 单元测试优化

- 使用多线程运行（最多4个线程）
- 测试超时设置为10秒
- 智能 Mock 配置减少重复设置

### E2E 测试优化

- CI 环境只运行 Chromium 浏览器
- 本地开发支持多浏览器测试
- 失败时才保留截图和视频
- 优化超时设置

## CI/CD 集成

### GitHub Actions

项目配置了完整的 CI/CD 流水线：

1. **代码质量检查**: ESLint + TypeScript 检查
2. **单元测试**: 运行所有单元测试并生成覆盖率报告
3. **E2E 测试**: 运行端到端测试
4. **部署检查**: 构建验证

### 本地 CI 模拟

```bash
# 运行完整的 CI 检查
npm run test:ci

# 或使用测试脚本
./scripts/run-tests.sh --ci
```

## 测试最佳实践

### 单元测试

1. **测试文件命名**: `*.test.ts`
2. **测试位置**: `src/lib/__tests__/`
3. **Mock 配置**: 使用标准化的 Mock 模式
4. **断言**: 使用描述性的测试名称

### E2E 测试

1. **测试文件命名**: `*.spec.ts`
2. **测试位置**: `tests/`
3. **页面对象**: 使用页面对象模式
4. **数据隔离**: 每个测试使用独立的测试数据

### 测试数据

1. **测试用户**: 使用预定义的测试账户
2. **数据清理**: 测试后自动清理数据
3. **数据隔离**: 避免测试间的数据污染

## 故障排除

### 常见问题

1. **测试超时**: 检查网络连接和数据库状态
2. **数据库连接失败**: 验证环境变量配置
3. **E2E 测试失败**: 确保开发服务器正在运行

### 调试技巧

```bash
# 运行单个测试文件
npm test -- auth.test.ts

# 以 UI 模式运行 E2E 测试
npm run test:e2e:ui

# 查看详细的测试输出
npm run test:unit -- --reporter=verbose
```

## 测试报告

### 覆盖率报告

- **HTML 报告**: `coverage/index.html`
- **JSON 报告**: `coverage/coverage-final.json`
- **LCOV 报告**: `coverage/lcov.info`

### E2E 测试报告

- **HTML 报告**: `playwright-report/index.html`
- **测试结果**: `test-results/`

## 持续改进

### 性能监控

- 测试运行时间目标: < 5 分钟
- 单元测试: < 1 分钟
- E2E 测试: < 4 分钟

### 质量指标

- 测试通过率: 100%
- 覆盖率趋势: 持续提升
- 测试稳定性: 减少 flaky 测试
