---
type: "always_apply"
---

# Supabase 集成规范

## 概述
本文档定义了易码网项目中 Supabase 集成的标准规范，包括客户端使用、错误处理、类型安全查询等。

## 1. 客户端导入规范

**规则**: 使用统一的 Supabase 客户端导入方式

```typescript
// ❌ 错误：错误的导入路径
import { createClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server';

// ✅ 正确：统一的导入方式
import { supabase, createServerSupabaseClient } from '@/lib/supabase';
```

## 2. 错误处理模式规范

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

## 3. 类型安全的查询规范

**规则**: 确保 Supabase 查询的类型安全

```typescript
// ❌ 错误：缺少类型信息
const response = await supabase.from('projects').select('*');
return ResponseWrapper.fromSupabase(response);

// ✅ 正确：明确的类型断言
const response = await supabase.from('projects').select('*');
return ResponseWrapper.fromSupabase(response) as ApiResponse<Project[]>;
```

## 4. 测试数据规范

### 4.1 完整类型定义规范
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

### 4.2 Mock 对象处理规范
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

## 5. 查询优化规范

### 5.1 选择性字段查询
```typescript
// ✅ 推荐：只查询需要的字段
const { data, error } = await supabase
  .from('projects')
  .select('id, title, price, seller_id')
  .eq('status', 'approved');
```

### 5.2 分页查询规范
```typescript
// ✅ 标准分页查询
const { data, error, count } = await supabase
  .from('projects')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1)
  .order('created_at', { ascending: false });
```

### 5.3 关联查询规范
```typescript
// ✅ 使用 join 进行关联查询
const { data, error } = await supabase
  .from('projects')
  .select(`
    *,
    categories(name),
    users(username)
  `)
  .eq('status', 'approved');
```

## 6. RLS (Row Level Security) 规范

### 6.1 策略定义原则
- 每个表都必须启用 RLS
- 策略应该尽可能具体和限制性
- 使用 `auth.uid()` 进行用户身份验证

### 6.2 常见策略模式
```sql
-- 用户只能访问自己的数据
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- 管理员可以访问所有数据
CREATE POLICY "Admins can view all data" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## 7. 实时订阅规范

### 7.1 订阅配置
```typescript
// ✅ 正确的实时订阅配置
const subscription = supabase
  .channel('projects-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'projects'
  }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();

// 清理订阅
useEffect(() => {
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## 8. 存储 (Storage) 规范

### 8.1 文件上传规范
```typescript
// ✅ 标准文件上传流程
const uploadFile = async (file: File, bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`文件上传失败: ${error.message}`);
  }

  return data;
};
```

### 8.2 文件访问规范
```typescript
// ✅ 获取公共文件 URL
const { data } = supabase.storage
  .from('project-files')
  .getPublicUrl('path/to/file.zip');

// ✅ 获取私有文件 URL（带签名）
const { data, error } = await supabase.storage
  .from('private-files')
  .createSignedUrl('path/to/file.zip', 3600); // 1小时有效期
```

## 9. 性能优化建议

### 9.1 查询优化
- 使用索引优化查询性能
- 避免 N+1 查询问题
- 合理使用 `limit` 和分页

### 9.2 连接池管理
- 合理配置连接池大小
- 避免长时间持有连接
- 使用连接池监控

### 9.3 缓存策略
- 对静态数据使用客户端缓存
- 合理设置 Cache-Control 头
- 使用 Supabase 的内置缓存机制
