-- 订单系统数据库表结构
-- 创建时间: 2025年6月30日
-- 说明: 实现项目购买、订单管理、下载权限等功能

-- 订单状态枚举
CREATE TYPE order_status AS ENUM (
    'pending',          -- 待支付
    'processing',       -- 处理中
    'completed',        -- 已完成
    'cancelled',        -- 已取消
    'refunded'          -- 已退款
);

-- 支付方式枚举
CREATE TYPE payment_method AS ENUM (
    'credits',          -- 积分支付
    'alipay',           -- 支付宝
    'wechat',           -- 微信支付
    'stripe',           -- Stripe
    'paypal'            -- PayPal
);

-- 订单表
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) UNIQUE NOT NULL, -- 订单号
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 订单金额信息
    original_price INTEGER NOT NULL, -- 原价（积分）
    discount_amount INTEGER DEFAULT 0, -- 折扣金额
    final_amount INTEGER NOT NULL, -- 最终支付金额
    
    -- 支付信息
    payment_method payment_method NOT NULL DEFAULT 'credits',
    payment_transaction_id VARCHAR(255), -- 第三方支付交易ID
    
    -- 订单状态
    status order_status NOT NULL DEFAULT 'pending',
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- 备注信息
    buyer_note TEXT, -- 买家备注
    seller_note TEXT, -- 卖家备注
    admin_note TEXT, -- 管理员备注
    
    -- 约束
    CONSTRAINT check_amounts_positive 
        CHECK (original_price > 0 AND final_amount >= 0 AND discount_amount >= 0),
    CONSTRAINT check_final_amount 
        CHECK (final_amount = original_price - discount_amount),
    CONSTRAINT check_buyer_not_seller 
        CHECK (buyer_id != seller_id)
);

-- 订单项目文件下载记录表
CREATE TABLE order_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT, -- 文件大小（字节）
    download_ip INET, -- 下载IP
    user_agent TEXT, -- 用户代理
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保只有订单买家可以下载
    CONSTRAINT check_download_permission 
        CHECK (user_id = (SELECT buyer_id FROM orders WHERE id = order_id))
);

-- 用户购买历史视图（便于查询）
CREATE VIEW user_purchase_history AS
SELECT 
    o.id as order_id,
    o.order_number,
    o.buyer_id,
    o.project_id,
    o.final_amount,
    o.payment_method,
    o.status,
    o.created_at,
    o.completed_at,
    p.title as project_title,
    p.short_description as project_description,
    p.thumbnail_url as project_thumbnail,
    p.file_urls as project_files,
    s.username as seller_username,
    s.email as seller_email,
    -- 下载统计
    (SELECT COUNT(*) FROM order_downloads WHERE order_id = o.id) as download_count,
    (SELECT MAX(created_at) FROM order_downloads WHERE order_id = o.id) as last_download_at
FROM orders o
JOIN projects p ON o.project_id = p.id
JOIN users s ON o.seller_id = s.id
WHERE o.status = 'completed';

-- 卖家销售统计视图
CREATE VIEW seller_sales_stats AS
SELECT 
    o.seller_id,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
    COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.final_amount ELSE 0 END), 0) as total_revenue,
    COALESCE(AVG(CASE WHEN o.status = 'completed' THEN o.final_amount END), 0) as avg_order_value,
    MIN(o.created_at) as first_sale_at,
    MAX(CASE WHEN o.status = 'completed' THEN o.completed_at END) as last_sale_at
FROM orders o
GROUP BY o.seller_id;

-- 创建索引优化查询性能
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_project_id ON orders(project_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_order_downloads_order_id ON order_downloads(order_id);
CREATE INDEX idx_order_downloads_user_id ON order_downloads(user_id);

-- 生成订单号的函数
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

-- 创建订单的存储过程
CREATE OR REPLACE FUNCTION create_order(
    p_buyer_id UUID,
    p_project_id UUID,
    p_payment_method payment_method DEFAULT 'credits'
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_seller_id UUID;
    v_project_price INTEGER;
    v_order_number VARCHAR(32);
    v_buyer_credits INTEGER;
BEGIN
    -- 获取项目信息
    SELECT seller_id, price INTO v_seller_id, v_project_price
    FROM projects 
    WHERE id = p_project_id AND status = 'approved';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '项目不存在或未发布';
    END IF;
    
    -- 检查买家不能购买自己的项目
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

-- 完成积分支付订单的存储过程
CREATE OR REPLACE FUNCTION complete_credits_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_transaction_id UUID;
BEGIN
    -- 获取订单信息
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '订单不存在';
    END IF;
    
    IF v_order.status != 'processing' OR v_order.payment_method != 'credits' THEN
        RAISE EXCEPTION '订单状态不正确';
    END IF;
    
    -- 扣除买家积分
    SELECT spend_user_credits(
        v_order.buyer_id,
        v_order.final_amount,
        'spend_purchase',
        '购买项目: ' || (SELECT title FROM projects WHERE id = v_order.project_id),
        v_order.project_id,
        'project'
    ) INTO v_transaction_id;
    
    -- 更新订单状态
    UPDATE orders SET
        status = 'completed'::order_status,
        paid_at = NOW(),
        completed_at = NOW(),
        payment_transaction_id = v_transaction_id::TEXT,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- 增加项目下载量
    UPDATE projects SET 
        download_count = download_count + 1,
        updated_at = NOW()
    WHERE id = v_order.project_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 取消订单的存储过程
CREATE OR REPLACE FUNCTION cancel_order(
    p_order_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_order orders%ROWTYPE;
BEGIN
    -- 获取订单信息
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '订单不存在';
    END IF;
    
    IF v_order.status NOT IN ('pending', 'processing') THEN
        RAISE EXCEPTION '订单状态不允许取消';
    END IF;
    
    -- 更新订单状态
    UPDATE orders SET
        status = 'cancelled'::order_status,
        cancelled_at = NOW(),
        updated_at = NOW(),
        admin_note = COALESCE(admin_note || E'\n', '') || '取消原因: ' || COALESCE(p_reason, '用户取消')
    WHERE id = p_order_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 记录文件下载的函数
CREATE OR REPLACE FUNCTION record_file_download(
    p_order_id UUID,
    p_user_id UUID,
    p_file_url TEXT,
    p_file_name VARCHAR(255),
    p_file_size BIGINT DEFAULT NULL,
    p_download_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_download_id UUID;
BEGIN
    -- 验证下载权限
    IF NOT EXISTS (
        SELECT 1 FROM orders 
        WHERE id = p_order_id 
        AND buyer_id = p_user_id 
        AND status = 'completed'
    ) THEN
        RAISE EXCEPTION '没有下载权限';
    END IF;
    
    -- 记录下载
    INSERT INTO order_downloads (
        order_id,
        user_id,
        file_url,
        file_name,
        file_size,
        download_ip,
        user_agent
    ) VALUES (
        p_order_id,
        p_user_id,
        p_file_url,
        p_file_name,
        p_file_size,
        p_download_ip,
        p_user_agent
    ) RETURNING id INTO v_download_id;
    
    RETURN v_download_id;
END;
$$ LANGUAGE plpgsql;

-- 自动更新 updated_at 字段的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 设置RLS策略
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_downloads ENABLE ROW LEVEL SECURITY;

-- 订单表RLS策略
-- 买家可以查看自己的订单
CREATE POLICY "Users can view their own orders as buyers" ON orders
    FOR SELECT USING (buyer_id = auth.uid());

-- 卖家可以查看自己项目的订单
CREATE POLICY "Users can view orders for their projects" ON orders
    FOR SELECT USING (seller_id = auth.uid());

-- 管理员可以查看所有订单
CREATE POLICY "Admins can view all orders" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 买家可以创建订单
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- 买家可以取消自己的待支付订单
CREATE POLICY "Buyers can cancel their pending orders" ON orders
    FOR UPDATE USING (
        buyer_id = auth.uid() 
        AND status IN ('pending', 'processing')
    );

-- 下载记录表RLS策略
-- 用户只能查看自己的下载记录
CREATE POLICY "Users can view their own downloads" ON order_downloads
    FOR SELECT USING (user_id = auth.uid());

-- 用户只能创建自己的下载记录
CREATE POLICY "Users can create their own download records" ON order_downloads
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 管理员可以查看所有下载记录
CREATE POLICY "Admins can view all downloads" ON order_downloads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
