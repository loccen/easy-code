# 数据库配置比对报告

## 比对时间
2025-06-30

## 比对说明
本报告比较了本地SQL脚本与实际Supabase数据库配置的差异。

## 主要发现

### 1. 表结构差异

#### 新增的表（实际数据库中存在，但本地脚本中缺失）
- `credit_configs` - 积分配置表
- `credit_transactions` - 积分交易记录表  
- `user_credits` - 用户积分账户表
- `orders` - 订单表
- `order_downloads` - 订单下载记录表
- `role_upgrade_requests` - 角色升级申请表

#### 表结构变更
- `projects` 表新增了 `file_urls` 字段（TEXT[]类型）

### 2. 枚举类型差异

#### 新增的枚举类型
- `credit_transaction_type` - 积分交易类型
- `order_status` - 订单状态
- `payment_method` - 支付方式
- `upgrade_request_status` - 升级申请状态

### 3. 函数差异

#### 新增的函数
- `check_username_available(text)` - 检查用户名可用性
- `check_email_available(text)` - 检查邮箱可用性
- `generate_order_number()` - 生成订单号
- `get_credit_config(text)` - 获取积分配置
- `get_user_credits(UUID)` - 获取用户积分
- `add_user_credits(...)` - 增加用户积分
- `spend_user_credits(...)` - 消费用户积分
- `create_order(...)` - 创建订单
- `complete_credits_order(UUID)` - 完成积分订单
- `cancel_order(UUID, text)` - 取消订单
- `record_file_download(...)` - 记录文件下载
- `increment_project_views(UUID)` - 增加项目浏览量
- `increment_project_downloads(UUID)` - 增加项目下载量
- `has_pending_upgrade_request(UUID, user_role)` - 检查待处理升级申请
- `get_pending_upgrade_requests_count()` - 获取待处理申请数量
- `handle_role_upgrade_approval()` - 处理角色升级审批

### 4. RLS策略差异

#### 完整的RLS策略体系
实际数据库中已经实现了完整的行级安全策略，包括：
- 用户只能查看/修改自己的数据
- 管理员可以查看/管理所有数据
- 公开数据的访问控制
- 项目发布状态的访问控制

### 5. 触发器差异

#### 新增的触发器
- 所有主要表都添加了 `updated_at` 自动更新触发器
- 角色升级审批触发器

## 建议的同步操作

### 1. 更新本地脚本
需要将以下脚本更新到最新状态：
- `setup-database.sql` - 添加缺失的表和字段
- `setup-credits.sql` - 已存在，需要验证完整性
- `setup-orders.sql` - 已存在，需要验证完整性
- `setup-role-upgrade.sql` - 已存在，需要验证完整性
- `setup-rls.sql` - 需要添加完整的RLS策略
- `setup-auth-config.sql` - 需要添加新的检查函数

### 2. 创建缺失的脚本
- 创建函数管理脚本，包含所有业务函数
- 创建触发器管理脚本

### 3. 验证数据一致性
- 检查枚举值是否完整
- 验证索引是否正确创建
- 确认约束条件是否一致

## 结论

实际数据库配置比本地脚本更加完整和先进，包含了：
1. 完整的积分系统
2. 订单管理系统
3. 角色升级系统
4. 完善的安全策略
5. 丰富的业务函数

建议将实际数据库配置作为标准，更新本地脚本以保持一致性。
