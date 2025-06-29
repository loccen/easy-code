# 易码网技术实现文档

## 📅 文档信息
**创建时间**: 2025年6月29日  
**最后更新**: 2025年6月29日  
**维护者**: 开发团队

## 🏗️ 技术架构概览

### 核心技术栈
- **前端框架**: Next.js 14 + React 18 + TypeScript
- **样式系统**: Tailwind CSS 4
- **状态管理**: Zustand
- **后端服务**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **部署平台**: Docker + Kubernetes (计划)
- **测试框架**: Playwright + Jest (计划)

### 项目结构
```
easy-code/
├── app/                     # Next.js应用主目录
│   ├── src/
│   │   ├── app/            # 页面路由 (App Router)
│   │   ├── components/     # 可复用组件
│   │   ├── lib/            # 工具函数和API
│   │   ├── stores/         # Zustand状态管理
│   │   ├── types/          # TypeScript类型定义
│   │   └── styles/         # 全局样式
│   ├── public/             # 静态资源
│   ├── scripts/            # 数据库脚本
│   └── tests/              # 测试文件
├── docs/                   # 项目文档
└── deployment/             # 部署配置 (计划)
```

## 🗄️ 数据库设计实现

### Supabase配置
- **项目ID**: lzxtubjbnaoaidpaibia
- **区域**: ap-southeast-1
- **数据库**: PostgreSQL 15
- **认证**: Supabase Auth
- **存储**: Supabase Storage

### 已实现的表结构

#### 1. users表 (用户基础信息)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    role user_role DEFAULT 'buyer',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. user_profiles表 (用户详细信息)
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(255),
    website_url VARCHAR(255),
    github_url VARCHAR(255),
    twitter_url VARCHAR(255),
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. categories表 (项目分类)
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. projects表 (项目信息)
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    category_id UUID REFERENCES categories(id),
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    status project_status NOT NULL DEFAULT 'draft',
    is_dockerized BOOLEAN DEFAULT FALSE,
    docker_verified BOOLEAN DEFAULT FALSE,
    tech_stack TEXT[],
    demo_url VARCHAR(255),
    github_url VARCHAR(255),
    documentation_url VARCHAR(255),
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    featured_until TIMESTAMP WITH TIME ZONE,
    file_urls TEXT[],
    review_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);
```

### 枚举类型
```sql
-- 用户角色
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');

-- 项目状态
CREATE TYPE project_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');
```

### 数据库函数
```sql
-- 增加项目浏览量
CREATE OR REPLACE FUNCTION increment_project_views(project_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE projects 
    SET view_count = view_count + 1 
    WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;

-- 增加项目下载量
CREATE OR REPLACE FUNCTION increment_project_downloads(project_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE projects 
    SET download_count = download_count + 1 
    WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;
```

## 🔐 安全实现

### 行级安全策略 (RLS)

#### users表策略
```sql
-- 用户只能查看自己的信息
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- 用户可以更新自己的信息
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);
```

#### projects表策略
```sql
-- 所有人可以查看已发布的项目
CREATE POLICY "Anyone can view published projects" ON projects
    FOR SELECT USING (status = 'approved');

-- 卖家可以查看自己的所有项目
CREATE POLICY "Sellers can view own projects" ON projects
    FOR SELECT USING (auth.uid() = seller_id);

-- 管理员可以查看所有项目
CREATE POLICY "Admins can view all projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

### 存储安全策略
```sql
-- 用户可以上传头像到avatars目录
CREATE POLICY "Users can upload own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-uploads' 
        AND (storage.foldername(name))[1] = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );
```

## 🎨 前端架构实现

### 组件系统

#### 核心UI组件
- **Button**: 5种变体 (primary, secondary, outline, ghost, destructive)
- **Input**: 支持标签、图标、错误状态、帮助文本
- **Card**: 头部、内容、底部结构
- **Badge**: 6种变体，3种尺寸
- **Avatar**: 4种尺寸，图片fallback
- **Loading**: 3种变体 (spinner, dots, pulse)

#### 布局组件
- **Layout**: 主布局容器
- **Header**: 导航栏，用户菜单，搜索
- **Footer**: 链接结构，版权信息

### 状态管理 (Zustand)

#### 认证状态
```typescript
interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}
```

### 路由结构
```
/                           # 主页
/auth/login                 # 登录
/auth/register              # 注册
/projects                   # 项目列表
/projects/[id]              # 项目详情
/search                     # 高级搜索
/categories                 # 分类浏览
/profile                    # 个人资料
/settings                   # 用户设置
/dashboard                  # 用户仪表板
/seller/upload              # 项目上传
/seller/projects            # 卖家项目管理
/admin/projects             # 管理员项目管理
/admin/categories           # 管理员分类管理
```

## 📡 API设计实现

### 认证API (lib/auth.ts)
```typescript
// 用户注册
export async function signUp(email: string, password: string, username: string)

// 用户登录
export async function signIn(email: string, password: string)

// 获取当前用户
export async function getCurrentUser(): Promise<AuthUser | null>

// 用户登出
export async function signOut()
```

### 项目API (lib/projects.ts)
```typescript
// 获取已发布项目列表
export async function getPublishedProjects(options?: ProjectQueryOptions)

// 根据ID获取项目详情
export async function getProjectById(id: string, checkStatus?: boolean)

// 获取卖家项目列表
export async function getSellerProjects(sellerId: string)

// 创建项目
export async function createProject(projectData: CreateProjectData)

// 更新项目
export async function updateProject(id: string, updates: UpdateProjectData)
```

### 分类API (lib/categories.ts)
```typescript
// 获取活跃分类
export async function getActiveCategories()

// 获取所有分类 (管理用)
export async function getAllCategories()

// 创建分类
export async function createCategory(categoryData: CreateCategoryData)

// 更新分类
export async function updateCategory(id: string, updates: UpdateCategoryData)
```

## 🧪 测试实现

### Playwright端到端测试
- ✅ 主页功能测试
- ✅ 用户认证流程测试
- ✅ 项目浏览功能测试
- ✅ 管理员功能测试

### 测试配置
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
```

## 🚀 部署配置

### 环境变量
```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://lzxtubjbnaoaidpaibia.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=易码网

# 部署编排服务配置 (计划)
DEPLOYMENT_SERVICE_URL=http://localhost:3001
```

### 自动化部署脚本
- ✅ `deploy-supabase.sh`: Supabase配置自动化部署
- ✅ 数据库迁移脚本
- ✅ RLS策略配置脚本

## 📝 开发规范

### 代码规范
- **TypeScript**: 严格模式，完整类型定义
- **ESLint**: Next.js推荐配置
- **Prettier**: 代码格式化
- **Husky**: Git hooks，代码质量检查

### 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

### 分支策略
- `main`: 主分支，稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复分支

---

**维护说明**: 此文档记录技术实现的具体细节，应在架构变更时及时更新。
