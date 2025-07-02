---
type: "always_apply"
---

# API 设计规范

## 概述
本文档定义了易码网项目的 API 设计标准，包括响应格式、中间件使用、错误处理等规范。

## 1. 统一响应格式规范

**规则**: 所有 API 响应必须使用统一的 ResponseWrapper

```typescript
// ❌ 错误：直接返回数据
return { success: true, data: projects };

// ✅ 正确：使用 ResponseWrapper
return ResponseWrapper.success(projects);

// ✅ 正确：错误响应
return ResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '数据验证失败');
```

### 1.1 ResponseWrapper 结构
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
```

### 1.2 成功响应示例
```typescript
// 单个资源
return ResponseWrapper.success(user);

// 列表资源（带分页）
return ResponseWrapper.success(projects, {
  total: 100,
  page: 1,
  limit: 10
});
```

### 1.3 错误响应示例
```typescript
// 验证错误
return ResponseWrapper.error(
  ErrorCode.VALIDATION_ERROR,
  '邮箱格式不正确',
  null,
  'email'
);

// 业务逻辑错误
return ResponseWrapper.error(
  ErrorCode.INSUFFICIENT_CREDITS,
  '积分不足，无法完成购买'
);
```

## 2. 中间件使用模式规范

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

### 2.1 认证中间件
```typescript
// ✅ 基础认证中间件
export const GET = withAuth(async (req: NextRequest, { user }) => {
  // user 已经通过认证
  return ResponseWrapper.success({ userId: user.id });
});

// ✅ 角色权限中间件
export const POST = withRole(['admin', 'seller'])(
  async (req: NextRequest, { user }) => {
    // 用户具有 admin 或 seller 角色
    return ResponseWrapper.success(data);
  }
);
```

### 2.2 验证中间件
```typescript
// ✅ 请求体验证
export const POST = withValidation(CreateProjectSchema)(
  async (req: NextRequest, { validatedData }) => {
    // validatedData 已经通过验证
    return ResponseWrapper.success(validatedData);
  }
);
```

## 3. 错误处理统一化规范

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

### 3.1 错误代码定义
```typescript
export enum ErrorCode {
  // 通用错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // 业务错误
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  PROJECT_NOT_AVAILABLE = 'PROJECT_NOT_AVAILABLE',
  DUPLICATE_PURCHASE = 'DUPLICATE_PURCHASE',
  
  // 数据库错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION'
}
```

## 4. 请求验证规范

### 4.1 输入验证
```typescript
// ✅ 使用 Zod 进行输入验证
const CreateProjectSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  price: z.number().positive(),
  currency: z.enum(['CREDITS', 'USD']),
  tech_stack: z.array(z.string()).min(1),
  is_dockerized: z.boolean()
});

export const POST = withValidation(CreateProjectSchema)(
  async (req: NextRequest, { validatedData }) => {
    // validatedData 类型安全且已验证
    const project = await createProject(validatedData);
    return ResponseWrapper.success(project);
  }
);
```

### 4.2 参数验证
```typescript
// ✅ URL 参数验证
const ParamsSchema = z.object({
  id: z.string().uuid()
});

export const GET = withParams(ParamsSchema)(
  async (req: NextRequest, { params }) => {
    const project = await getProjectById(params.id);
    return ResponseWrapper.success(project);
  }
);
```

## 5. 分页和排序规范

### 5.1 分页参数
```typescript
// ✅ 标准分页参数
const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
});
```

### 5.2 分页响应
```typescript
// ✅ 分页响应格式
return ResponseWrapper.success(projects, {
  total: totalCount,
  page: currentPage,
  limit: pageSize,
  totalPages: Math.ceil(totalCount / pageSize)
});
```

## 6. 缓存策略

### 6.1 HTTP 缓存头
```typescript
// ✅ 设置适当的缓存头
export const GET = async (req: NextRequest) => {
  const projects = await getPublicProjects();
  
  return new NextResponse(
    JSON.stringify(ResponseWrapper.success(projects)),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5分钟缓存
      }
    }
  );
};
```

### 6.2 条件请求
```typescript
// ✅ 支持 ETag 和 Last-Modified
export const GET = async (req: NextRequest) => {
  const ifNoneMatch = req.headers.get('if-none-match');
  const etag = generateETag(data);
  
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }
  
  return new NextResponse(
    JSON.stringify(ResponseWrapper.success(data)),
    {
      headers: {
        'ETag': etag,
        'Cache-Control': 'public, max-age=300'
      }
    }
  );
};
```

## 7. API 版本控制

### 7.1 URL 版本控制
```typescript
// ✅ 在路径中包含版本
// /api/v1/projects
// /api/v2/projects
```

### 7.2 向后兼容性
```typescript
// ✅ 保持向后兼容
interface ProjectV1 {
  id: string;
  title: string;
  price: number;
}

interface ProjectV2 extends ProjectV1 {
  currency: string;
  tags: string[];
}
```

## 8. 安全规范

### 8.1 输入清理
```typescript
// ✅ 清理和验证输入
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};
```

### 8.2 速率限制
```typescript
// ✅ 实现速率限制
export const POST = withRateLimit({ max: 10, window: 60000 })(
  async (req: NextRequest) => {
    // API 逻辑
  }
);
```
