# 易码网 API 规格说明

## 1. API 设计原则

### 1.1 RESTful 设计
- 使用标准HTTP方法（GET, POST, PUT, PATCH, DELETE）
- 资源导向的URL设计
- 统一的响应格式
- 合理的HTTP状态码使用

### 1.2 版本控制
- URL路径版本控制：`/api/v1/`
- 向后兼容性保证
- 废弃API的渐进式迁移

### 1.3 安全性
- JWT Token认证
- API密钥认证（第三方集成）
- 请求频率限制
- 输入数据验证

## 2. 通用规范

### 2.1 请求格式
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-API-Key: <api_key> (可选)
X-Request-ID: <unique_request_id>
```

### 2.2 响应格式
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "code": 200,
  "timestamp": "2024-01-01T00:00:00Z",
  "request_id": "req_123456789"
}
```

### 2.3 错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "输入数据验证失败",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "request_id": "req_123456789"
}
```

### 2.4 分页格式
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

## 3. 认证授权 API

### 3.1 用户注册
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "confirm_password": "password123"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "role": "buyer",
      "email_verified": false
    },
    "tokens": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_in": 3600
    }
  }
}
```

### 3.2 用户登录
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "remember_me": true
}
```

### 3.3 刷新Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token"
}
```

### 3.4 用户登出
```http
POST /api/v1/auth/logout
Authorization: Bearer <jwt_token>
```

## 4. 用户管理 API

### 4.1 获取用户信息
```http
GET /api/v1/users/me
Authorization: Bearer <jwt_token>
```

### 4.2 更新用户信息
```http
PATCH /api/v1/users/me
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "first_name": "张",
  "last_name": "三",
  "bio": "全栈开发者",
  "github_url": "https://github.com/username"
}
```

### 4.3 上传头像
```http
POST /api/v1/users/me/avatar
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

avatar: <file>
```

### 4.4 获取用户公开信息
```http
GET /api/v1/users/{user_id}
```

## 5. 项目管理 API

### 5.1 获取项目列表
```http
GET /api/v1/projects?page=1&limit=20&category=web&tech_stack=react&min_price=0&max_price=1000&sort=rating&order=desc
```

**查询参数：**
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20，最大100）
- `category`: 分类ID或slug
- `tech_stack`: 技术栈（可多个）
- `min_price`, `max_price`: 价格范围
- `sort`: 排序字段（rating, price, created_at, download_count）
- `order`: 排序方向（asc, desc）
- `search`: 搜索关键词

### 5.2 获取项目详情
```http
GET /api/v1/projects/{project_id}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "React电商管理系统",
    "description": "完整的电商后台管理系统...",
    "price": 299.00,
    "currency": "CNY",
    "tech_stack": ["React", "Node.js", "PostgreSQL"],
    "is_dockerized": true,
    "demo_url": "https://demo.example.com",
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "alt": "首页截图",
        "is_cover": true
      }
    ],
    "seller": {
      "id": "uuid",
      "username": "seller",
      "avatar_url": "https://example.com/avatar.jpg",
      "rating": 4.8
    },
    "stats": {
      "download_count": 156,
      "rating_average": 4.7,
      "rating_count": 23
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 5.3 创建项目
```http
POST /api/v1/projects
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "React电商管理系统",
  "description": "完整的电商后台管理系统...",
  "short_description": "基于React的现代化电商管理平台",
  "category_id": "uuid",
  "price": 299.00,
  "tech_stack": ["React", "Node.js", "PostgreSQL"],
  "demo_url": "https://demo.example.com",
  "github_url": "https://github.com/user/repo"
}
```

### 5.4 上传项目文件
```http
POST /api/v1/projects/{project_id}/files
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: <file>
is_main_file: true
```

### 5.5 上传项目图片
```http
POST /api/v1/projects/{project_id}/images
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

image: <file>
alt_text: "首页截图"
is_cover: true
```

## 6. 订单交易 API

### 6.1 创建订单
```http
POST /api/v1/orders
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "project_id": "uuid",
  "payment_method": "stripe"
}
```

### 6.2 获取订单列表
```http
GET /api/v1/orders?page=1&limit=20&status=completed
Authorization: Bearer <jwt_token>
```

### 6.3 获取订单详情
```http
GET /api/v1/orders/{order_id}
Authorization: Bearer <jwt_token>
```

### 6.4 下载已购买项目
```http
GET /api/v1/orders/{order_id}/download
Authorization: Bearer <jwt_token>
```

## 7. 支付系统 API

### 7.1 创建支付
```http
POST /api/v1/payments
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "order_id": "uuid",
  "payment_method": "stripe",
  "return_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel"
}
```

### 7.2 确认支付
```http
POST /api/v1/payments/{payment_id}/confirm
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "payment_intent_id": "pi_xxx"
}
```

### 7.3 支付回调（Webhook）
```http
POST /api/v1/payments/webhook/{provider}
Content-Type: application/json
X-Webhook-Signature: <signature>

{
  "event_type": "payment.succeeded",
  "data": {}
}
```

## 8. 积分系统 API

### 8.1 获取积分余额
```http
GET /api/v1/credits/balance
Authorization: Bearer <jwt_token>
```

### 8.2 获取积分记录
```http
GET /api/v1/credits/transactions?page=1&limit=20&type=earn
Authorization: Bearer <jwt_token>
```

### 8.3 积分充值
```http
POST /api/v1/credits/recharge
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 100.00,
  "payment_method": "stripe"
}
```

### 8.4 积分提现
```http
POST /api/v1/credits/withdraw
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 500.00,
  "account_type": "bank",
  "account_info": {
    "bank_name": "中国银行",
    "account_number": "1234567890",
    "account_name": "张三"
  }
}
```

## 9. 部署服务 API

### 9.1 创建演示部署
```http
POST /api/v1/deployments/demo
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "project_id": "uuid",
  "duration_hours": 2
}
```

### 9.2 获取部署状态
```http
GET /api/v1/deployments/{deployment_id}
Authorization: Bearer <jwt_token>
```

### 9.3 延长演示时间
```http
POST /api/v1/deployments/{deployment_id}/extend
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "additional_hours": 1
}
```

### 9.4 停止部署
```http
DELETE /api/v1/deployments/{deployment_id}
Authorization: Bearer <jwt_token>
```

### 9.5 生成部署脚本
```http
POST /api/v1/deployments/script
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "project_id": "uuid",
  "platform": "aws",
  "config": {
    "region": "us-west-2",
    "instance_type": "t3.micro"
  }
}
```

## 10. 评价系统 API

### 10.1 创建评价
```http
POST /api/v1/reviews
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "project_id": "uuid",
  "order_id": "uuid",
  "rating": 5,
  "title": "非常好用的项目",
  "content": "代码质量很高，文档详细...",
  "is_anonymous": false
}
```

### 10.2 获取项目评价
```http
GET /api/v1/projects/{project_id}/reviews?page=1&limit=20&sort=created_at&order=desc
```

### 10.3 回复评价
```http
POST /api/v1/reviews/{review_id}/replies
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "感谢您的评价..."
}
```

## 11. 搜索 API

### 11.1 全文搜索
```http
GET /api/v1/search?q=react+ecommerce&type=projects&page=1&limit=20
```

### 11.2 搜索建议
```http
GET /api/v1/search/suggestions?q=react
```

### 11.3 热门搜索
```http
GET /api/v1/search/trending
```

## 12. 管理后台 API

### 12.1 获取待审核项目
```http
GET /api/v1/admin/projects/pending?page=1&limit=20
Authorization: Bearer <admin_jwt_token>
```

### 12.2 审核项目
```http
POST /api/v1/admin/projects/{project_id}/review
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "action": "approve",
  "comment": "项目质量良好，通过审核"
}
```

### 12.3 获取平台统计
```http
GET /api/v1/admin/stats?period=30d
Authorization: Bearer <admin_jwt_token>
```

## 13. 错误码定义

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| SUCCESS | 200 | 操作成功 |
| VALIDATION_ERROR | 400 | 输入数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| RATE_LIMITED | 429 | 请求频率超限 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 |

## 14. 限流规则

| 端点类型 | 限制 | 时间窗口 |
|----------|------|----------|
| 认证相关 | 5次/分钟 | 1分钟 |
| 文件上传 | 10次/分钟 | 1分钟 |
| 搜索API | 100次/分钟 | 1分钟 |
| 一般API | 1000次/小时 | 1小时 |
| 管理API | 500次/小时 | 1小时 |
