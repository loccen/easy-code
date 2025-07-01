# ESLint 和 TypeScript 配置最佳实践

## 📋 推荐的 ESLint 配置

### 基础配置 (.eslintrc.json)
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/prefer-const": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn"
  },
  "ignorePatterns": [
    "node_modules/",
    ".next/",
    "out/",
    "build/",
    "dist/"
  ]
}
```

### TypeScript 配置 (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

## 🔧 常用 ESLint 规则说明

### 核心规则
- `@typescript-eslint/no-explicit-any`: 禁止使用 `any` 类型
- `@typescript-eslint/no-unused-vars`: 禁止未使用的变量
- `@typescript-eslint/prefer-const`: 优先使用 `const`
- `@typescript-eslint/no-non-null-assertion`: 警告非空断言的使用

### 代码质量规则
- `prefer-const`: 优先使用 `const` 声明
- `no-var`: 禁止使用 `var`
- `no-console`: 警告 console 语句（生产环境应移除）

## 🚀 自动化脚本

### package.json 脚本配置
```json
{
  "scripts": {
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "lint:strict": "next lint --max-warnings 0",
    "type-check": "tsc --noEmit",
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "quality-check": "npm run lint && npm run type-check && npm run test"
  }
}
```

### Git Hooks 配置 (husky)
```bash
# 安装 husky
npm install --save-dev husky

# 初始化 husky
npx husky init

# 添加 pre-commit hook
echo "npm run quality-check" > .husky/pre-commit
```

## 📝 VS Code 配置

### settings.json
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

### 推荐扩展
- ESLint
- TypeScript Importer
- Prettier - Code formatter
- Auto Rename Tag
- Bracket Pair Colorizer

## 🔍 常见问题解决

### 1. ESLint 和 Prettier 冲突
```bash
# 安装 eslint-config-prettier
npm install --save-dev eslint-config-prettier

# 在 .eslintrc.json 中添加
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ]
}
```

### 2. 路径别名配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

### 3. 测试文件 ESLint 配置
```json
// .eslintrc.json
{
  "overrides": [
    {
      "files": ["**/__tests__/**/*", "**/*.test.*"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off"
      }
    }
  ]
}
```

## 🎯 最佳实践

### 1. 渐进式类型检查
```typescript
// 从宽松到严格
// 1. 先禁用 any
// 2. 添加基本类型
// 3. 完善接口定义
// 4. 添加泛型约束

// 示例：API 响应类型演进
// 阶段1：基础类型
interface ApiResponse {
  success: boolean;
  data?: unknown;
}

// 阶段2：泛型类型
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 阶段3：完整类型
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}
```

### 2. 类型守卫模式
```typescript
// 类型守卫函数
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

// 使用类型守卫
function processUserData(data: unknown) {
  if (isUser(data)) {
    // data 现在是 User 类型
    console.log(data.email);
  }
}
```

### 3. 错误处理模式
```typescript
// 统一错误处理
class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 错误处理函数
function handleError(error: unknown): ApiResponse<never> {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }
  
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message
      }
    };
  }
  
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: '未知错误'
    }
  };
}
```

## 📊 代码质量指标

### 目标指标
- ESLint 错误：0
- ESLint 警告：< 10
- TypeScript 错误：0
- 测试覆盖率：> 80%
- 构建时间：< 2 分钟

### 监控脚本
```bash
#!/bin/bash
# quality-check.sh

echo "🔍 运行代码质量检查..."

echo "📝 ESLint 检查..."
npm run lint

echo "🔧 TypeScript 检查..."
npm run type-check

echo "🧪 测试检查..."
npm run test

echo "🏗️ 构建检查..."
npm run build

echo "✅ 代码质量检查完成！"
```
