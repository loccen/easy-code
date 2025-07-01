# 易码网API架构文档

## 📋 概述

本文档描述了易码网项目中统一API架构的设计和使用方法。该架构解决了Supabase-first架构下响应格式不统一、错误处理分散等问题。

## 🏗️ 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (前端)                      │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Direct Call   │    │        API Routes Call         │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Unified API Client                       │
├─────────────────────────────────────────────────────────────┤
│                   API Layer (Next.js Routes)               │
├─────────────────────────────────────────────────────────────┤
│                   Service Layer (业务逻辑)                  │
├─────────────────────────────────────────────────────────────┤
│                Data Access Layer (数据访问)                 │
├─────────────────────────────────────────────────────────────┤
│                    Supabase (数据库+RLS)                    │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

1. **统一响应格式** (`response.ts`)
2. **Service层** (`services/`)
3. **API中间件** (`middleware.ts`)
4. **统一客户端** (`client.ts`)

## 📝 使用指南

### 1. 统一响应格式

所有API响应都使用统一的格式：

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}
```

#### 创建成功响应

```typescript
import { ResponseWrapper } from '@/lib/api/response';

// 简单成功响应
const response = ResponseWrapper.success(data);

// 带分页的响应
const response = ResponseWrapper.paginated(data, pagination);

// 处理Supabase响应
const supabaseResponse = await supabase.from('projects').select('*');
const response = ResponseWrapper.fromSupabase(supabaseResponse);
```

#### 创建错误响应

```typescript
import { ResponseWrapper, ErrorCode } from '@/lib/api/response';

// 业务错误
const response = ResponseWrapper.error(
  ErrorCode.VALIDATION_ERROR,
  '数据验证失败',
  validationDetails
);

// 抛出业务异常
throw new BusinessError(
  ErrorCode.PERMISSION_DENIED,
  '权限不足'
);
```

### 2. Service层使用

#### 创建Service

```typescript
import { BaseService } from '@/lib/services/base.service';

export class ProjectService extends BaseService<Project> {
  constructor() {
    super('projects');
  }

  // 实现特定业务逻辑
  async getPublishedProjects(params: ProjectQueryParams) {
    const queryParams = {
      ...params,
      filters: { ...params.filters, status: 'approved' }
    };
    
    return this.findMany(queryParams, `
      *,
      category:categories(id, name),
      seller:users!seller_id(id, username)
    `);
  }

  // 重写验证逻辑
  protected async validateCreate(data: Partial<Project>) {
    if (!data.title) {
      return ResponseWrapper.error(
        ErrorCode.VALIDATION_ERROR,
        '标题不能为空',
        null,
        'title'
      );
    }
    return ResponseWrapper.success(undefined);
  }

  // 重写搜索逻辑
  protected applySearch(query: any, search: string) {
    return query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
}

// 导出单例
export const projectService = new ProjectService();
```

#### 使用Service

```typescript
import { projectService } from '@/lib/services/project.service';

// 获取项目列表
const result = await projectService.getPublishedProjects({
  page: 1,
  limit: 20,
  search: 'react',
  filters: { category_id: 'web' }
});

if (result.success) {
  console.log('项目列表:', result.data);
  console.log('分页信息:', result.meta?.pagination);
} else {
  console.error('错误:', result.error);
}
```

### 3. API Routes使用

#### 创建API路由

```typescript
import { withApiHandler, withAuth, withValidation } from '@/lib/api/middleware';
import { projectService } from '@/lib/services/project.service';
import { z } from 'zod';

const CreateProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  price: z.number().positive(),
});

// GET /api/projects
export const GET = withApiHandler(async (req) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  
  return await projectService.getPublishedProjects(params);
});

// POST /api/projects
export const POST = compose(
  withAuth,
  withValidation(CreateProjectSchema)
)(async (req, context) => {
  const { user, body } = context;
  
  return await projectService.createProject(user.id, body);
});
```

#### 错误处理

```typescript
// 自动错误处理
export const GET = withApiHandler(async (req) => {
  // 如果抛出异常，会自动转换为错误响应
  throw new BusinessError(
    ErrorCode.RESOURCE_NOT_FOUND,
    '项目不存在'
  );
});

// 手动错误处理
export const GET = withApiHandler(async (req) => {
  const result = await projectService.findById('invalid-id');
  
  if (!result.success) {
    // 直接返回错误响应
    return result;
  }
  
  return result;
});
```

### 4. 前端客户端使用

#### 基本使用

```typescript
import { apiClient } from '@/lib/api/client';

// 智能调用 - 自动选择调用方式
const result = await apiClient.call({
  // Supabase直接调用
  supabase: (client) => client
    .from('projects')
    .select('*')
    .eq('status', 'approved'),
  
  // API Routes调用
  api: {
    endpoint: '/projects',
    method: 'GET',
    params: { status: 'approved' }
  }
});

if (result.success) {
  setProjects(result.data);
} else {
  showError(result.error?.message);
}
```

#### 直接调用Supabase

```typescript
// 直接调用Supabase
const result = await apiClient.callSupabase(
  (client) => client
    .from('projects')
    .select('*')
    .eq('status', 'approved')
);
```

#### 调用API Routes

```typescript
// 调用API Routes
const result = await apiClient.callApi('/projects', {
  method: 'POST',
  body: projectData
});
```

#### 实时订阅

```typescript
// 实时订阅
const unsubscribe = apiClient.subscribeToChanges(
  'projects',
  (payload) => {
    console.log('项目更新:', payload);
    // 更新本地状态
  },
  'status=eq.approved'
);

// 清理订阅
useEffect(() => {
  return unsubscribe;
}, []);
```

#### 文件上传

```typescript
// 文件上传
const result = await apiClient.uploadFile(
  'project-files',
  `projects/${projectId}/source.zip`,
  file,
  { contentType: 'application/zip' }
);

if (result.success) {
  console.log('上传成功:', result.data.fullPath);
}
```

## 🔧 配置选项

### API客户端配置

```typescript
import { ApiClient } from '@/lib/api/client';

// 创建配置了API Routes的客户端
const apiRoutesClient = new ApiClient({
  useApiRoutes: true,  // 优先使用API Routes
  timeout: 30000,      // 30秒超时
  retries: 3           // 重试3次
});

// 使用配置的客户端
const result = await apiRoutesClient.call({
  supabase: (client) => client.from('projects').select('*'),
  api: { endpoint: '/projects' }
});
```

### 中间件组合

```typescript
import { compose, withAuth, withRole, withValidation } from '@/lib/api/middleware';

// 组合多个中间件
export const POST = compose(
  withAuth,                    // 需要认证
  withRole(['admin', 'seller']), // 需要特定角色
  withValidation(CreateProjectSchema) // 数据验证
)(async (req, context) => {
  // 处理逻辑
});
```

## 🧪 测试

### Service测试

```typescript
import { projectService } from '@/lib/services/project.service';

describe('ProjectService', () => {
  it('should get published projects', async () => {
    const result = await projectService.getPublishedProjects({
      page: 1,
      limit: 10
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
    expect(result.meta?.pagination).toBeDefined();
  });
  
  it('should handle validation errors', async () => {
    const result = await projectService.create({
      title: '', // 无效标题
      description: 'test'
    });
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });
});
```

### API Routes测试

```typescript
import { GET } from '@/app/api/projects/route';

describe('/api/projects', () => {
  it('should return projects list', async () => {
    const request = new Request('http://localhost/api/projects');
    const response = await GET(request);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toBeInstanceOf(Array);
  });
});
```

## 🚀 最佳实践

### 1. 错误处理

- 使用语义化的错误码
- 提供详细的错误信息
- 区分业务错误和系统错误

### 2. 数据验证

- 在Service层进行业务验证
- 在API层进行数据格式验证
- 使用Zod进行类型安全的验证

### 3. 性能优化

- 合理使用缓存
- 避免N+1查询问题
- 使用分页减少数据传输

### 4. 安全考虑

- 始终验证用户权限
- 使用RLS策略保护数据
- 避免敏感信息泄露

## 📚 相关文档

- [开发路线图](../../../docs/development-roadmap.md)
- [Jira任务清单](../../../docs/jira-tasks.md)
- [Supabase文档](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
