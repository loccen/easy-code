-- 易码网数据库当前配置导出
-- 导出时间: 2025-06-30
-- 此文件包含当前Supabase数据库的完整结构和配置

-- ========================================
-- 枚举类型定义
-- ========================================

CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');
CREATE TYPE project_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');
CREATE TYPE credit_transaction_type AS ENUM (
    'earn_register', 'earn_upload', 'earn_review', 'earn_referral', 
    'earn_daily', 'earn_docker', 'spend_purchase', 'spend_feature', 
    'refund_purchase', 'admin_adjust'
);
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('credits', 'alipay', 'wechat', 'stripe', 'paypal');
CREATE TYPE upgrade_request_status AS ENUM ('pending', 'approved', 'rejected');

-- ========================================
-- 表结构定义
-- ========================================

-- 用户基础信息表
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

-- 用户详细信息表
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

-- 项目分类表
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

-- 项目基础信息表
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
    review_comment TEXT,
    file_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- 用户积分账户表
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_credits INTEGER NOT NULL DEFAULT 0,
    available_credits INTEGER NOT NULL DEFAULT 0,
    frozen_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 积分交易记录表
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type credit_transaction_type NOT NULL,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 积分配置表
CREATE TABLE credit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订单表
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) UNIQUE NOT NULL,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_price INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0,
    final_amount INTEGER NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'credits',
    payment_transaction_id VARCHAR(255),
    status order_status NOT NULL DEFAULT 'pending',
    buyer_note TEXT,
    seller_note TEXT,
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- 订单下载记录表
CREATE TABLE order_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    download_ip INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 角色升级申请表
CREATE TABLE role_upgrade_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_role user_role NOT NULL,
    to_role user_role NOT NULL,
    status upgrade_request_status NOT NULL DEFAULT 'pending',
    reason TEXT NOT NULL,
    experience TEXT,
    portfolio_url VARCHAR(255),
    github_url VARCHAR(255),
    admin_comment TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 索引定义
-- ========================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

CREATE INDEX idx_projects_seller_id ON projects(seller_id);
CREATE INDEX idx_projects_category_id ON projects(category_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_price ON projects(price);
CREATE INDEX idx_projects_rating ON projects(rating_average);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_featured ON projects(featured);

-- ========================================
-- 触发器函数
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_configs_updated_at BEFORE UPDATE ON credit_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_upgrade_requests_updated_at BEFORE UPDATE ON role_upgrade_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 业务函数定义
-- ========================================

-- 检查用户名是否可用
CREATE OR REPLACE FUNCTION check_username_available(username_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (SELECT 1 FROM users WHERE username = username_to_check);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查邮箱是否可用
CREATE OR REPLACE FUNCTION check_email_available(email_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (SELECT 1 FROM users WHERE email = email_to_check);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 生成订单号
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(32) AS $$
DECLARE
    order_num VARCHAR(32);
    exists_check INTEGER;
BEGIN
    LOOP
        -- 生成格式: EC + YYYYMMDD + 8位随机数字
        order_num := 'EC' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');

        -- 检查是否已存在
        SELECT COUNT(*) INTO exists_check FROM orders WHERE order_number = order_num;

        -- 如果不存在则返回
        IF exists_check = 0 THEN
            RETURN order_num;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 获取积分配置
CREATE OR REPLACE FUNCTION get_credit_config(p_config_key text)
RETURNS INTEGER AS $$
DECLARE
    v_config_value INTEGER;
BEGIN
    SELECT config_value INTO v_config_value
    FROM credit_configs
    WHERE config_key = p_config_key AND is_active = TRUE;

    IF v_config_value IS NULL THEN
        RAISE EXCEPTION '积分配置不存在: %', p_config_key;
    END IF;

    RETURN v_config_value;
END;
$$ LANGUAGE plpgsql;

-- 获取用户积分信息
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS TABLE(total_credits INTEGER, available_credits INTEGER, frozen_credits INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT
        uc.total_credits,
        uc.available_credits,
        uc.frozen_credits
    FROM user_credits uc
    WHERE uc.user_id = p_user_id;

    -- 如果账户不存在，返回0
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 增加用户积分
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type credit_transaction_type,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- 参数验证
    IF p_amount <= 0 THEN
        RAISE EXCEPTION '积分数量必须大于0';
    END IF;

    -- 获取当前积分余额，如果账户不存在则创建
    INSERT INTO user_credits (user_id, total_credits, available_credits, frozen_credits)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT available_credits INTO v_current_balance
    FROM user_credits
    WHERE user_id = p_user_id;

    v_new_balance := v_current_balance + p_amount;

    -- 更新积分账户
    UPDATE user_credits
    SET
        total_credits = total_credits + p_amount,
        available_credits = available_credits + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 记录交易
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        description, reference_id, reference_type, created_by
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, v_current_balance, v_new_balance,
        p_description, p_reference_id, p_reference_type, p_created_by
    ) RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- 消费用户积分
CREATE OR REPLACE FUNCTION spend_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type credit_transaction_type,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- 参数验证
    IF p_amount <= 0 THEN
        RAISE EXCEPTION '消费积分数量必须大于0';
    END IF;

    -- 获取当前可用积分
    SELECT available_credits INTO v_current_balance
    FROM user_credits
    WHERE user_id = p_user_id;

    -- 检查积分是否足够
    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION '用户积分账户不存在';
    END IF;

    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION '积分余额不足，当前可用积分: %', v_current_balance;
    END IF;

    v_new_balance := v_current_balance - p_amount;

    -- 更新积分账户
    UPDATE user_credits
    SET
        total_credits = total_credits - p_amount,
        available_credits = available_credits - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 记录交易（消费记录为负数）
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        description, reference_id, reference_type, created_by
    ) VALUES (
        p_user_id, p_transaction_type, -p_amount, v_current_balance, v_new_balance,
        p_description, p_reference_id, p_reference_type, p_created_by
    ) RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- 创建订单
CREATE OR REPLACE FUNCTION create_order(
    p_buyer_id UUID,
    p_project_id UUID,
    p_payment_method payment_method
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_order_number VARCHAR(32);
    v_project_price INTEGER;
    v_seller_id UUID;
    v_buyer_credits INTEGER;
BEGIN
    -- 检查项目是否存在且已发布
    SELECT price, seller_id INTO v_project_price, v_seller_id
    FROM projects
    WHERE id = p_project_id AND status = 'approved';

    IF NOT FOUND THEN
        RAISE EXCEPTION '项目不存在或未发布';
    END IF;

    -- 检查买家是否是卖家本人
    IF p_buyer_id = v_seller_id THEN
        RAISE EXCEPTION '不能购买自己的项目';
    END IF;

    -- 检查是否已经购买过
    IF EXISTS (
        SELECT 1 FROM orders
        WHERE buyer_id = p_buyer_id
        AND project_id = p_project_id
        AND status = 'completed'
    ) THEN
        RAISE EXCEPTION '您已经购买过此项目';
    END IF;

    -- 如果使用积分支付，检查余额
    IF p_payment_method = 'credits' THEN
        SELECT available_credits INTO v_buyer_credits
        FROM user_credits
        WHERE user_id = p_buyer_id;

        IF v_buyer_credits IS NULL OR v_buyer_credits < v_project_price THEN
            RAISE EXCEPTION '积分余额不足';
        END IF;
    END IF;

    -- 生成订单号
    v_order_number := generate_order_number();

    -- 创建订单
    INSERT INTO orders (
        order_number,
        buyer_id,
        project_id,
        seller_id,
        original_price,
        final_amount,
        payment_method,
        status
    ) VALUES (
        v_order_number,
        p_buyer_id,
        p_project_id,
        v_seller_id,
        v_project_price,
        v_project_price,
        p_payment_method,
        CASE WHEN p_payment_method = 'credits' THEN 'processing'::order_status ELSE 'pending'::order_status END
    ) RETURNING id INTO v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- RLS策略定义
-- ========================================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- users表策略
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- user_profiles表策略
CREATE POLICY "Users can view own profile details" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile details" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile details" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- categories表策略
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (true);

-- projects表策略
CREATE POLICY "Anyone can view published projects" ON projects FOR SELECT USING (status = 'approved'::project_status);
CREATE POLICY "Public can view approved projects" ON projects FOR SELECT USING (status = 'approved'::project_status);
CREATE POLICY "Sellers can view own projects" ON projects FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Admins can view all projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Sellers can create projects" ON projects FOR INSERT WITH CHECK (
    (auth.role() = 'authenticated'::text) AND
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = 'seller'::user_role OR users.role = 'admin'::user_role)))
);
CREATE POLICY "Sellers can update own projects" ON projects FOR UPDATE USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Sellers can delete own projects" ON projects FOR DELETE USING (seller_id = auth.uid());

-- user_credits表策略
CREATE POLICY "Users can view own credits" ON user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own credits" ON user_credits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all credits" ON user_credits FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);
CREATE POLICY "Admins can update all credits" ON user_credits FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);

-- credit_transactions表策略
CREATE POLICY "Users can view own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON credit_transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);
CREATE POLICY "Admins can insert all transactions" ON credit_transactions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);

-- credit_configs表策略
CREATE POLICY "Anyone can view credit configs" ON credit_configs FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage credit configs" ON credit_configs FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);

-- orders表策略
CREATE POLICY "Users can view their own orders as buyers" ON orders FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Users can view orders for their projects" ON orders FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Buyers can cancel their pending orders" ON orders FOR UPDATE USING (
    (buyer_id = auth.uid()) AND (status = ANY (ARRAY['pending'::order_status, 'processing'::order_status]))
);
CREATE POLICY "Admins can view all orders" ON orders FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);

-- order_downloads表策略
CREATE POLICY "Users can view their own downloads" ON order_downloads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own download records" ON order_downloads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all downloads" ON order_downloads FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);

-- role_upgrade_requests表策略
CREATE POLICY "Users can view own upgrade requests" ON role_upgrade_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own upgrade requests" ON role_upgrade_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending requests" ON role_upgrade_requests FOR UPDATE USING (
    (auth.uid() = user_id) AND (status = 'pending'::upgrade_request_status)
);
CREATE POLICY "Admins can view all upgrade requests" ON role_upgrade_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);
CREATE POLICY "Admins can update all upgrade requests" ON role_upgrade_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);
