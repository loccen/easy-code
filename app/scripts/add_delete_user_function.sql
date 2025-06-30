-- 创建用户自删除函数
-- 这个函数允许用户删除自己的账户，包括认证用户记录

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
BEGIN
    -- 获取当前认证用户的ID
    current_user_id := auth.uid();
    
    -- 检查用户是否已认证
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- 删除用户相关数据（按依赖关系顺序）
    -- 1. 删除项目购买记录
    DELETE FROM project_purchases WHERE user_id = current_user_id;
    
    -- 2. 删除积分交易记录
    DELETE FROM credit_transactions WHERE user_id = current_user_id;
    
    -- 3. 删除角色升级申请
    DELETE FROM role_upgrade_requests WHERE user_id = current_user_id;
    
    -- 4. 删除用户项目
    DELETE FROM projects WHERE user_id = current_user_id;
    
    -- 5. 删除用户记录
    DELETE FROM users WHERE id = current_user_id;
    
    -- 注意：认证用户记录需要通过 auth.users 表删除
    -- 但这需要特殊权限，所以我们在应用层处理
END;
$$;

-- 授予认证用户执行权限
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- 添加注释
COMMENT ON FUNCTION delete_user_account() IS '允许用户删除自己的账户和所有相关数据';
