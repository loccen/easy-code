# 易码网数据库设计

## 1. 数据库架构概述

### 1.1 数据库选择
- **主数据库**：PostgreSQL 15+ (通过Supabase提供)
- **缓存数据库**：Redis 7+
- **搜索引擎**：Elasticsearch 8+ (可选)
- **文件存储**：Supabase Storage (基于S3)

### 1.2 设计原则
- **规范化设计**：减少数据冗余，保证数据一致性
- **性能优化**：合理使用索引，优化查询性能
- **扩展性**：支持水平和垂直扩展
- **安全性**：敏感数据加密，访问权限控制
- **可维护性**：清晰的命名规范，完整的文档

## 2. 核心数据模型

### 2.1 用户管理模块

#### users - 用户基础信息表
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'buyer',
    status user_status NOT NULL DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户角色枚举
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');

-- 用户状态枚举
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

#### user_profiles - 用户详细信息表
```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar_url TEXT,
    bio TEXT,
    github_url VARCHAR(255),
    website_url VARCHAR(255),
    location VARCHAR(100),
    timezone VARCHAR(50),
    language VARCHAR(10) DEFAULT 'zh-CN',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### user_auth - 用户认证信息表
```sql
CREATE TABLE user_auth (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(32),
    backup_codes TEXT[],
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 项目管理模块

#### projects - 项目基础信息表
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- 项目状态枚举
CREATE TYPE project_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');

-- 索引
CREATE INDEX idx_projects_seller_id ON projects(seller_id);
CREATE INDEX idx_projects_category_id ON projects(category_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_price ON projects(price);
CREATE INDEX idx_projects_rating ON projects(rating_average);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_featured ON projects(featured);
```

#### categories - 项目分类表
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
```

#### project_tags - 项目标签关联表
```sql
CREATE TABLE project_tags (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    PRIMARY KEY (project_id, tag_name)
);

-- 索引
CREATE INDEX idx_project_tags_tag_name ON project_tags(tag_name);
```

#### project_files - 项目文件表
```sql
CREATE TABLE project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50),
    file_hash VARCHAR(64),
    storage_url TEXT NOT NULL,
    is_main_file BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_file_hash ON project_files(file_hash);
```

#### project_images - 项目图片表
```sql
CREATE TABLE project_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_project_images_project_id ON project_images(project_id);
CREATE INDEX idx_project_images_sort_order ON project_images(sort_order);
```

### 2.3 交易管理模块

#### orders - 订单表
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
    platform_fee DECIMAL(10,2) NOT NULL,
    seller_amount DECIMAL(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 订单状态枚举
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'completed', 'cancelled', 'refunded');

-- 索引
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_project_id ON orders(project_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

#### payments - 支付记录表
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255),
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 支付状态枚举
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');

-- 索引
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_provider_transaction_id ON payments(provider_transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### 2.4 积分系统模块

#### credits - 积分记录表
```sql
CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    type credit_type NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    balance_after DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 积分类型枚举
CREATE TYPE credit_type AS ENUM ('earn', 'spend', 'refund', 'bonus', 'penalty');

-- 索引
CREATE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_credits_type ON credits(type);
CREATE INDEX idx_credits_created_at ON credits(created_at);
CREATE INDEX idx_credits_reference ON credits(reference_id, reference_type);
```

#### credit_balances - 积分余额表
```sql
CREATE TABLE credit_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    frozen_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_spent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.5 评价系统模块

#### reviews - 评价表
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status review_status NOT NULL DEFAULT 'published',
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 评价状态枚举
CREATE TYPE review_status AS ENUM ('published', 'hidden', 'deleted');

-- 索引
CREATE INDEX idx_reviews_project_id ON reviews(project_id);
CREATE INDEX idx_reviews_buyer_id ON reviews(buyer_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- 唯一约束：每个订单只能评价一次
CREATE UNIQUE INDEX idx_reviews_order_unique ON reviews(order_id);
```

#### review_replies - 评价回复表
```sql
CREATE TABLE review_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX idx_review_replies_user_id ON review_replies(user_id);
```

### 2.6 部署管理模块

#### deployments - 部署记录表
```sql
CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),
    deployment_type deployment_type NOT NULL,
    status deployment_status NOT NULL DEFAULT 'pending',
    environment_url VARCHAR(255),
    docker_image VARCHAR(255),
    k8s_namespace VARCHAR(63),
    k8s_deployment_name VARCHAR(63),
    config JSONB DEFAULT '{}',
    logs TEXT,
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 部署类型枚举
CREATE TYPE deployment_type AS ENUM ('demo', 'production');

-- 部署状态枚举
CREATE TYPE deployment_status AS ENUM ('pending', 'building', 'deploying', 'running', 'failed', 'stopped', 'expired');

-- 索引
CREATE INDEX idx_deployments_project_id ON deployments(project_id);
CREATE INDEX idx_deployments_user_id ON deployments(user_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_expires_at ON deployments(expires_at);
```

## 3. 数据库优化策略

### 3.1 索引优化
```sql
-- 复合索引示例
CREATE INDEX idx_projects_status_category ON projects(status, category_id);
CREATE INDEX idx_orders_buyer_status ON orders(buyer_id, status);
CREATE INDEX idx_credits_user_type_created ON credits(user_id, type, created_at);

-- 部分索引示例
CREATE INDEX idx_projects_active ON projects(id) WHERE status = 'approved';
CREATE INDEX idx_orders_pending ON orders(id) WHERE status = 'pending';
```

### 3.2 分区策略
```sql
-- 按时间分区的订单表
CREATE TABLE orders_partitioned (
    LIKE orders INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE orders_2024_q1 PARTITION OF orders_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
```

### 3.3 视图定义
```sql
-- 项目统计视图
CREATE VIEW project_stats AS
SELECT 
    p.id,
    p.title,
    p.price,
    p.download_count,
    p.rating_average,
    COUNT(DISTINCT o.id) as order_count,
    SUM(o.amount) as total_revenue
FROM projects p
LEFT JOIN orders o ON p.id = o.project_id AND o.status = 'completed'
WHERE p.status = 'approved'
GROUP BY p.id, p.title, p.price, p.download_count, p.rating_average;

-- 用户积分统计视图
CREATE VIEW user_credit_stats AS
SELECT 
    user_id,
    SUM(CASE WHEN type IN ('earn', 'bonus') THEN amount ELSE 0 END) as total_earned,
    SUM(CASE WHEN type IN ('spend', 'penalty') THEN amount ELSE 0 END) as total_spent,
    SUM(amount) as current_balance
FROM credits
GROUP BY user_id;
```

## 4. 数据安全和备份

### 4.1 行级安全策略 (RLS)
```sql
-- 启用行级安全
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 用户只能查看已发布的项目或自己的项目
CREATE POLICY project_select_policy ON projects
    FOR SELECT USING (
        status = 'approved' OR 
        seller_id = auth.uid()
    );

-- 用户只能修改自己的项目
CREATE POLICY project_update_policy ON projects
    FOR UPDATE USING (seller_id = auth.uid());
```

### 4.2 敏感数据加密
```sql
-- 创建加密函数
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;

-- 解密函数
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;
```

### 4.3 审计日志
```sql
-- 审计日志表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 审计触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name, operation, old_values, new_values, user_id
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```
