# Supabase 配置指南

## 1. 创建Supabase项目

1. 访问 [Supabase](https://supabase.com) 并登录
2. 点击 "New Project" 创建新项目
3. 选择组织和输入项目信息：
   - 项目名称：easy-code
   - 数据库密码：设置一个强密码
   - 区域：选择离你最近的区域（建议选择新加坡）

## 2. 获取项目配置

项目创建完成后，在项目设置中获取以下信息：

1. 进入 Settings > API
2. 复制以下信息：
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - anon public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - service_role secret key (SUPABASE_SERVICE_ROLE_KEY)

## 3. 配置环境变量

将获取的信息填入 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. 执行数据库脚本

### 4.1 创建数据表

1. 进入 Supabase Dashboard > SQL Editor
2. 复制 `scripts/setup-database.sql` 的内容
3. 粘贴并执行脚本

### 4.2 设置行级安全策略

1. 在 SQL Editor 中
2. 复制 `scripts/setup-rls.sql` 的内容
3. 粘贴并执行脚本

## 5. 配置认证

### 5.1 启用邮箱认证

1. 进入 Authentication > Settings
2. 确保 "Enable email confirmations" 已启用
3. 配置邮件模板（可选）

### 5.2 配置重定向URL

在 Authentication > URL Configuration 中添加：
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

## 6. 配置存储

### 6.1 创建存储桶

1. 进入 Storage
2. 创建以下桶：
   - `avatars` - 用户头像
   - `project-files` - 项目文件
   - `project-images` - 项目图片

### 6.2 设置存储策略

为每个桶设置适当的访问策略：

```sql
-- 头像桶策略
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 项目文件桶策略
CREATE POLICY "Project files are accessible to buyers" ON storage.objects
FOR SELECT USING (bucket_id = 'project-files');

CREATE POLICY "Sellers can upload project files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 7. 测试连接

运行应用并检查：

```bash
npm run dev
```

检查浏览器控制台是否有Supabase连接错误。

## 8. 常见问题

### Q: 无法连接到Supabase
A: 检查环境变量是否正确配置，确保URL和密钥没有多余的空格

### Q: RLS策略不生效
A: 确保已启用行级安全，并且策略语法正确

### Q: 文件上传失败
A: 检查存储桶是否创建，策略是否正确设置

## 9. 安全注意事项

1. 永远不要在客户端代码中暴露 service_role 密钥
2. 定期轮换API密钥
3. 为生产环境设置适当的RLS策略
4. 启用MFA保护Supabase账户
