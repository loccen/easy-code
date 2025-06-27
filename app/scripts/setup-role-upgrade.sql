-- 用户角色升级申请表
-- 用于管理买家申请成为卖家的流程

-- 创建申请状态枚举
CREATE TYPE upgrade_request_status AS ENUM ('pending', 'approved', 'rejected');

-- 创建角色升级申请表
CREATE TABLE role_upgrade_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_role user_role NOT NULL,
    to_role user_role NOT NULL,
    status upgrade_request_status NOT NULL DEFAULT 'pending',
    reason TEXT NOT NULL, -- 申请理由
    experience TEXT, -- 开发经验
    portfolio_url VARCHAR(255), -- 作品集链接
    github_url VARCHAR(255), -- GitHub链接
    admin_comment TEXT, -- 管理员审核意见
    reviewed_by UUID REFERENCES users(id), -- 审核管理员
    reviewed_at TIMESTAMP WITH TIME ZONE, -- 审核时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_role_upgrade_requests_user_id ON role_upgrade_requests(user_id);
CREATE INDEX idx_role_upgrade_requests_status ON role_upgrade_requests(status);
CREATE INDEX idx_role_upgrade_requests_created_at ON role_upgrade_requests(created_at);
CREATE INDEX idx_role_upgrade_requests_reviewed_by ON role_upgrade_requests(reviewed_by);

-- 添加约束：确保用户不能重复申请相同的角色升级
CREATE UNIQUE INDEX idx_role_upgrade_requests_unique_pending 
ON role_upgrade_requests(user_id, to_role) 
WHERE status = 'pending';

-- 添加更新时间触发器
CREATE TRIGGER update_role_upgrade_requests_updated_at 
BEFORE UPDATE ON role_upgrade_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全
ALTER TABLE role_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- RLS策略：用户只能查看自己的申请
CREATE POLICY "Users can view own upgrade requests" ON role_upgrade_requests
    FOR SELECT USING (auth.uid() = user_id);

-- RLS策略：用户可以创建自己的申请
CREATE POLICY "Users can create own upgrade requests" ON role_upgrade_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS策略：用户可以更新自己的待审核申请
CREATE POLICY "Users can update own pending requests" ON role_upgrade_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- RLS策略：管理员可以查看所有申请
CREATE POLICY "Admins can view all upgrade requests" ON role_upgrade_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- RLS策略：管理员可以更新所有申请
CREATE POLICY "Admins can update all upgrade requests" ON role_upgrade_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 创建函数：处理角色升级申请审核
CREATE OR REPLACE FUNCTION handle_role_upgrade_approval()
RETURNS TRIGGER AS $$
DECLARE
    current_user_role user_role;
BEGIN
    -- 如果申请被批准，更新用户角色
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        -- 获取用户当前角色
        SELECT role INTO current_user_role
        FROM users
        WHERE id = NEW.user_id;

        -- 权限层级：admin > seller > buyer
        -- 只有在目标角色权限更高时才更新角色
        IF (current_user_role = 'buyer' AND NEW.to_role IN ('seller', 'admin')) OR
           (current_user_role = 'seller' AND NEW.to_role = 'admin') THEN
            UPDATE users
            SET role = NEW.to_role, updated_at = NOW()
            WHERE id = NEW.user_id;
        END IF;

        -- 如果是管理员申请成为卖家，不更新角色，因为管理员已经拥有卖家权限
        -- 如果是管理员申请成为买家，不更新角色，因为管理员已经拥有买家权限
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：当申请状态变为approved时自动更新用户角色
CREATE TRIGGER on_role_upgrade_approved
    AFTER UPDATE ON role_upgrade_requests
    FOR EACH ROW
    WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
    EXECUTE FUNCTION handle_role_upgrade_approval();

-- 创建函数：获取待审核的角色升级申请数量
CREATE OR REPLACE FUNCTION get_pending_upgrade_requests_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM role_upgrade_requests 
        WHERE status = 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：检查用户是否有待审核的申请
CREATE OR REPLACE FUNCTION has_pending_upgrade_request(user_uuid UUID, target_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM role_upgrade_requests 
        WHERE user_id = user_uuid 
        AND to_role = target_role 
        AND status = 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
