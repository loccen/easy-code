-- 积分系统数据库表结构
-- 创建时间: 2025年6月29日
-- 说明: 实现用户积分获取、消费、查询等基础功能

-- 积分交易类型枚举
CREATE TYPE credit_transaction_type AS ENUM (
    'earn_register',        -- 注册奖励
    'earn_upload',          -- 上传项目奖励
    'earn_review',          -- 评价奖励
    'earn_referral',        -- 推荐奖励
    'earn_daily',           -- 每日签到
    'earn_docker',          -- Docker化项目双倍奖励
    'spend_purchase',       -- 购买项目消费
    'spend_feature',        -- 项目置顶消费
    'refund_purchase',      -- 购买退款
    'admin_adjust'          -- 管理员调整
);

-- 用户积分账户表
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_credits INTEGER NOT NULL DEFAULT 0,
    available_credits INTEGER NOT NULL DEFAULT 0,
    frozen_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保积分数据一致性
    CONSTRAINT check_credits_consistency 
        CHECK (total_credits = available_credits + frozen_credits),
    CONSTRAINT check_credits_non_negative 
        CHECK (total_credits >= 0 AND available_credits >= 0 AND frozen_credits >= 0),
    
    -- 每个用户只能有一个积分账户
    UNIQUE(user_id)
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
    reference_id UUID,  -- 关联的项目ID、订单ID等
    reference_type VARCHAR(50), -- 'project', 'order', 'user' 等
    created_by UUID REFERENCES users(id), -- 操作者（管理员调整时使用）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保交易金额合理
    CONSTRAINT check_transaction_amount 
        CHECK (amount != 0),
    CONSTRAINT check_balance_calculation 
        CHECK (balance_after = balance_before + amount)
);

-- 积分配置表（系统配置）
CREATE TABLE credit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认积分配置
INSERT INTO credit_configs (config_key, config_value, description) VALUES
('register_bonus', 100, '用户注册奖励积分'),
('upload_bonus', 50, '上传项目奖励积分'),
('docker_multiplier', 2, 'Docker化项目奖励倍数'),
('review_bonus', 10, '评价项目奖励积分'),
('daily_signin_bonus', 5, '每日签到奖励积分'),
('referral_bonus', 200, '推荐新用户奖励积分'),
('min_purchase_amount', 1, '最小购买金额（积分）'),
('max_daily_earn', 500, '每日最大获得积分限制');

-- 创建索引优化查询性能
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_reference ON credit_transactions(reference_id, reference_type);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_credits_updated_at 
    BEFORE UPDATE ON user_credits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_configs_updated_at 
    BEFORE UPDATE ON credit_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 积分操作函数：增加积分
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

-- 积分操作函数：消费积分
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

-- 获取用户积分余额函数
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS TABLE(
    total_credits INTEGER,
    available_credits INTEGER,
    frozen_credits INTEGER
) AS $$
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

-- 获取积分配置函数
CREATE OR REPLACE FUNCTION get_credit_config(p_config_key VARCHAR(100))
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

-- 为现有用户初始化积分账户
INSERT INTO user_credits (user_id, total_credits, available_credits, frozen_credits)
SELECT id, 0, 0, 0
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 给现有用户发放注册奖励积分
DO $$
DECLARE
    user_record RECORD;
    register_bonus INTEGER;
BEGIN
    -- 获取注册奖励配置
    SELECT get_credit_config('register_bonus') INTO register_bonus;
    
    -- 为每个现有用户发放注册奖励
    FOR user_record IN SELECT id FROM users LOOP
        PERFORM add_user_credits(
            user_record.id,
            register_bonus,
            'earn_register',
            '注册奖励积分',
            NULL,
            'system',
            NULL
        );
    END LOOP;
END $$;
