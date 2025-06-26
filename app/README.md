# 易码网 - 专业的源码交易平台

## 项目概述

易码网是一个专业的源码交易平台，为开发者提供安全、高效的源码交易体验。采用 Next.js + Supabase + 部署编排服务的 MVP 架构。

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **状态管理**: Zustand
- **后端**: Next.js API Routes, Supabase
- **数据库**: PostgreSQL (Supabase)
- **认证**: Supabase Auth
- **部署**: Docker, Kubernetes

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install
```

### 2. Supabase 配置

#### 自动化配置（推荐）
```bash
# 设置环境变量
export SUPABASE_PROJECT_ID=your_project_id
export SUPABASE_ACCESS_TOKEN=your_access_token

# 执行自动化部署
cd scripts
./deploy-supabase.sh
```

#### 手动配置
参考 `docs/supabase-setup.md` 进行手动配置。

### 3. 环境变量配置

复制并配置环境变量：
```bash
cp .env.example .env.local
```

更新 `.env.local` 中的 Supabase 配置：
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 功能特性

### ✅ 已完成功能

- **用户认证系统**
  - 用户注册/登录/登出
  - 角色管理（买家/卖家/管理员）
  - 用户资料管理
  - 权限控制

- **数据库架构**
  - 用户管理表
  - 项目分类表
  - 项目信息表
  - 行级安全策略

- **基础界面**
  - 响应式主页
  - 登录/注册页面
  - 用户仪表板
  - 数据库连接测试

### 🚧 开发中功能

- 基础UI组件库
- 项目上传和管理
- 项目展示和搜索
- 交易和积分系统
- 部署编排服务

## 测试账户

开发环境提供以下测试账户：

- **买家账户**: newuser@test.com / password123
- **卖家账户**: seller@test.com / password123

## 相关文档

- [Supabase 配置指南](docs/supabase-setup.md)
- [Supabase 配置总结](docs/supabase-configuration-summary.md)
- [项目总结](../docs/project-summary.md)
- [架构设计](../docs/architecture/mvp-architecture.md)
- [数据库设计](../docs/architecture/database-design.md)
