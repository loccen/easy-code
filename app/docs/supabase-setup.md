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

### 4.1 自动化部署（推荐）

使用提供的自动化脚本：

```bash
# 设置环境变量
export SUPABASE_PROJECT_ID=your_project_id
export SUPABASE_ACCESS_TOKEN=your_access_token

# 执行部署脚本
cd app/scripts
./deploy-supabase.sh
```

### 4.2 手动部署

如果需要手动执行：

1. 进入 Supabase Dashboard > SQL Editor
2. 按顺序执行以下脚本：
   - `scripts/setup-database.sql` - 创建数据表
   - `scripts/setup-rls.sql` - 设置行级安全策略
   - `scripts/setup-auth-config.sql` - 配置认证触发器

## 5. 配置认证

### 5.1 自动配置（推荐）

如果使用了自动化部署脚本，认证配置已自动完成，包括：
- 邮箱自动确认（开发环境）
- 站点URL设置
- 启用用户注册
- 密码最小长度设置

### 5.2 手动配置

如果需要手动配置：

1. 进入 Authentication > Settings
2. 设置以下选项：
   - Enable email confirmations: 关闭（开发环境）
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

## 9. 验证部署

部署完成后，验证以下功能：

### 9.1 数据库连接
```bash
npm run dev
# 访问 http://localhost:3000
# 检查数据库连接测试部分
```

### 9.2 认证功能
- 注册新用户：http://localhost:3000/auth/register
- 登录用户：http://localhost:3000/auth/login
- 查看仪表板：http://localhost:3000/dashboard

### 9.3 测试账户
- 买家：newuser@test.com / password123
- 卖家：seller@test.com / password123

## 10. 故障排除

### 10.1 常见问题
- **注册失败**：检查RLS策略是否正确
- **递归查询错误**：确认策略没有循环引用
- **邮箱确认问题**：确认自动确认已启用

### 10.2 调试步骤
1. 检查浏览器控制台错误
2. 查看Supabase项目日志
3. 验证环境变量配置
4. 测试数据库连接

## 11. 相关文档

- `supabase-configuration-summary.md` - 详细配置总结
- `scripts/deploy-supabase.sh` - 自动化部署脚本
- `scripts/setup-*.sql` - 数据库脚本文件

## 12. 安全注意事项

1. 永远不要在客户端代码中暴露 service_role 密钥
2. 定期轮换API密钥
3. 为生产环境设置适当的RLS策略
4. 启用MFA保护Supabase账户
5. 生产环境中重新启用邮箱确认
