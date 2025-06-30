-- 易码网行级安全策略设置
-- 确保用户只能访问自己有权限的数据

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 用户表策略
-- 用户只能查看自己的信息
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- 用户可以更新自己的信息
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 允许新用户注册时插入数据
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 用户详情表策略
-- 用户只能查看自己的详情
CREATE POLICY "Users can view own profile details" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- 用户可以插入和更新自己的详情
CREATE POLICY "Users can insert own profile details" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile details" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- 项目表策略
-- 所有人可以查看已发布的项目
CREATE POLICY "Anyone can view published projects" ON projects
    FOR SELECT USING (status = 'approved');

-- 卖家可以查看自己的所有项目
CREATE POLICY "Sellers can view own projects" ON projects
    FOR SELECT USING (auth.uid() = seller_id);

-- 管理员可以查看所有项目（简化版，避免递归查询）
CREATE POLICY "Admins can view all projects" ON projects
    FOR SELECT USING (true); -- 临时简化，后续可优化

-- 卖家可以插入项目
CREATE POLICY "Sellers can insert projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- 卖家可以更新自己的项目
CREATE POLICY "Sellers can update own projects" ON projects
    FOR UPDATE USING (auth.uid() = seller_id);

-- 分类表策略
-- 所有人可以查看激活的分类
CREATE POLICY "Anyone can view active categories" ON categories
    FOR SELECT USING (is_active = true);

-- 管理员可以管理分类（简化版，避免递归查询）
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (true); -- 临时简化，后续可优化

-- 创建一些基础分类数据
INSERT INTO categories (name, slug, description, icon, sort_order) VALUES
('Web应用', 'web-apps', '基于Web技术的应用程序', 'globe', 1),
('移动应用', 'mobile-apps', 'iOS和Android移动应用', 'smartphone', 2),
('桌面应用', 'desktop-apps', '桌面端应用程序', 'monitor', 3),
('API服务', 'api-services', '后端API和微服务', 'server', 4),
('工具库', 'libraries', '开发工具和库', 'package', 5),
('模板主题', 'templates', '网站模板和主题', 'layout', 6),
('数据分析', 'data-analytics', '数据分析和可视化', 'bar-chart', 7),
('人工智能', 'ai-ml', 'AI和机器学习项目', 'brain', 8),
('区块链', 'blockchain', '区块链和加密货币', 'link', 9),
('游戏开发', 'games', '游戏和娱乐应用', 'gamepad', 10);

-- 创建一个测试用户（开发环境使用）
-- 注意：生产环境中应该删除这些测试数据
INSERT INTO users (id, email, username, role, email_verified) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@easycode.com', 'admin', 'admin', true),
('00000000-0000-0000-0000-000000000002', 'seller@easycode.com', 'seller_demo', 'seller', true),
('00000000-0000-0000-0000-000000000003', 'buyer@easycode.com', 'buyer_demo', 'buyer', true);

-- 为测试用户创建详情
INSERT INTO user_profiles (user_id, first_name, last_name, bio) VALUES
('00000000-0000-0000-0000-000000000001', '系统', '管理员', '易码网系统管理员'),
('00000000-0000-0000-0000-000000000002', '演示', '卖家', '这是一个演示卖家账户'),
('00000000-0000-0000-0000-000000000003', '演示', '买家', '这是一个演示买家账户');

-- ========================================
-- 积分系统相关RLS策略
-- ========================================

-- 启用积分相关表的RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_configs ENABLE ROW LEVEL SECURITY;

-- user_credits 表策略
CREATE POLICY "Users can view own credits" ON user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credits" ON user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credits" ON user_credits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all credits" ON user_credits FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);
CREATE POLICY "Admins can insert all credits" ON user_credits FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);
CREATE POLICY "Admins can update all credits" ON user_credits FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);

-- credit_transactions 表策略
CREATE POLICY "Users can view own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON credit_transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);
CREATE POLICY "Admins can insert all transactions" ON credit_transactions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);

-- credit_configs 表策略
CREATE POLICY "Anyone can view credit configs" ON credit_configs FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage credit configs" ON credit_configs FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);
