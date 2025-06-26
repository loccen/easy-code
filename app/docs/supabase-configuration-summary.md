# Supabase 配置总结

## 概述

本文档总结了易码网项目在开发过程中对 Supabase 的所有配置修改，确保后续部署和迁移时能够快速重现相同的配置。

## 1. 数据库结构

### 核心表
- `users` - 用户基础信息表
- `user_profiles` - 用户详细信息表
- `categories` - 项目分类表
- `projects` - 项目基础信息表

### 枚举类型
- `user_role` - 用户角色 (buyer, seller, admin)
- `user_status` - 用户状态 (active, inactive, suspended, banned)
- `project_status` - 项目状态 (draft, pending_review, approved, rejected, archived)

## 2. 行级安全策略 (RLS) 修复

### 问题
初始的 RLS 策略存在递归查询问题，导致注册失败。

### 解决方案
1. **用户表策略**：
   - 移除递归的管理员检查
   - 添加用户插入策略：`Users can insert own profile`
   - 简化查看和更新策略

2. **用户详情表策略**：
   - 移除递归查询
   - 保持基本的用户数据访问控制

3. **项目表策略**：
   - 临时简化管理员策略，避免递归
   - 保持卖家基本权限控制

4. **分类表策略**：
   - 临时简化管理员策略

### 关键修复
```sql
-- 允许新用户注册时插入数据
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);
```

## 3. 认证配置修改

### API 配置更改
通过 Supabase API 进行的配置修改：

1. **邮箱自动确认**：
   ```json
   {"mailer_autoconfirm": true}
   ```

2. **站点URL设置**：
   ```json
   {"site_url": "http://localhost:3000"}
   ```

3. **启用用户注册**：
   ```json
   {"disable_signup": false}
   ```

4. **密码最小长度**：
   ```json
   {"password_min_length": 6}
   ```

### 触发器配置
创建了自动化触发器来同步 auth.users 和 public.users：

- `handle_new_user()` - 新用户创建时自动创建记录
- `handle_user_update()` - 用户更新时同步信息
- `handle_user_delete()` - 用户删除时清理数据

## 4. 测试数据

### 基础分类
创建了10个基础项目分类：
- Web应用、移动应用、桌面应用
- API服务、工具库、模板主题
- 数据分析、人工智能、区块链、游戏开发

### 测试用户
- 买家账户：newuser@test.com / password123
- 卖家账户：seller@test.com / password123

## 5. 部署脚本

### 自动化脚本
创建了 `deploy-supabase.sh` 脚本，包含：
- 环境变量检查
- SQL 脚本执行
- 认证配置设置
- 错误处理和日志

### 使用方法
```bash
export SUPABASE_PROJECT_ID=your_project_id
export SUPABASE_ACCESS_TOKEN=your_access_token
./scripts/deploy-supabase.sh
```

## 6. 文件清单

### SQL 脚本
- `setup-database.sql` - 数据库表结构（已更新）
- `setup-rls.sql` - 行级安全策略（已修复）
- `setup-auth-config.sql` - 认证配置和触发器（新增）

### 部署工具
- `deploy-supabase.sh` - 自动化部署脚本（新增）

### 文档
- `supabase-setup.md` - 原始设置指南
- `supabase-configuration-summary.md` - 配置总结（本文档）

## 7. 验证清单

部署完成后，请验证以下功能：

### 数据库
- [ ] 所有表创建成功
- [ ] 索引和触发器正常工作
- [ ] RLS 策略生效

### 认证
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 用户登出功能正常
- [ ] 角色权限正确显示

### 数据同步
- [ ] auth.users 和 public.users 同步
- [ ] 用户详情自动创建
- [ ] 角色更新正常工作

## 8. 故障排除

### 常见问题
1. **注册失败**：检查 RLS 策略是否正确设置
2. **递归查询错误**：确保策略中没有循环引用
3. **邮箱确认问题**：确认 `mailer_autoconfirm` 设置为 true
4. **权限问题**：检查用户角色是否正确设置

### 调试步骤
1. 检查 Supabase 项目日志
2. 验证环境变量配置
3. 测试数据库连接
4. 验证 RLS 策略

## 9. 后续优化

### 安全性
- 生产环境中重新启用邮箱确认
- 优化 RLS 策略，添加更精确的权限控制
- 实现更复杂的角色权限系统

### 性能
- 添加更多数据库索引
- 优化查询性能
- 实现数据缓存策略

### 功能
- 添加更多认证方式（OAuth）
- 实现用户头像上传
- 添加用户活动日志
