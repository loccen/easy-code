# 易码网系统架构设计

## 1. 架构概述

### 1.1 架构原则
- **微服务化**：核心功能模块化，独立部署和扩展
- **容器化**：统一使用Docker容器技术
- **云原生**：基于Kubernetes的容器编排
- **API优先**：RESTful API设计，前后端分离
- **安全第一**：多层安全防护机制
- **高可用**：无单点故障，支持水平扩展

### 1.2 技术栈选择

#### 前端技术栈
- **框架**：Next.js 14+ (React 18+)
- **样式**：Tailwind CSS + Headless UI
- **状态管理**：Zustand / React Query
- **类型检查**：TypeScript
- **构建工具**：Turbopack (Next.js内置)

#### 后端技术栈
- **主应用**：Next.js API Routes + Supabase
- **部署编排器**：Node.js/Deno + Express/Hono
- **数据库**：PostgreSQL (Supabase)
- **缓存**：Redis
- **消息队列**：Redis Pub/Sub / BullMQ

#### 基础设施
- **容器化**：Docker + Docker Compose
- **编排**：Kubernetes
- **CI/CD**：GitLab CI/CD
- **监控**：Prometheus + Grafana
- **日志**：ELK Stack (Elasticsearch + Logstash + Kibana)

## 2. 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户层 (User Layer)                        │
├─────────────────────────────────────────────────────────────────┤
│  Web浏览器  │  移动浏览器  │  API客户端  │  管理后台  │  开发工具   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CDN + 负载均衡层                             │
├─────────────────────────────────────────────────────────────────┤
│           CloudFlare CDN + Nginx Load Balancer                 │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    主应用服务 (Next.js App)                       │
├─────────────────────────────────────────────────────────────────┤
│ • 用户认证和管理    • 源码市场和项目管理    • 订单交易处理      │
│ • 审核系统         • 积分系统(简化版)      • 支付接口(预留)    │
│ • 评价系统         • 文件管理             • 管理后台          │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP API调用
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   部署编排服务 (Node.js)                          │
├─────────────────────────────────────────────────────────────────┤
│ • Docker镜像构建    • Kubernetes部署     • 演示环境管理        │
│ • 容器生命周期管理  • 资源监控           • 自动清理            │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据存储层 (Data Layer)                      │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Redis缓存  │  文件存储  │  Docker Registry  │  K8s │
│   (主数据库)  │   (缓存)    │ (Supabase) │    (镜像仓库)     │ 集群  │
└─────────────────────────────────────────────────────────────────┘
```

## 3. 简化架构设计 (MVP版本)

### 3.1 服务拆分策略

#### 主应用服务 (Main Application Service)
- **职责**：用户界面、业务逻辑、数据管理、支付处理、积分系统
- **技术**：Next.js + Supabase
- **端口**：3000
- **数据库**：PostgreSQL (Supabase)
- **集成功能**：
  - 用户认证和管理
  - 项目市场和管理
  - 订单和交易处理
  - 积分系统（简化版）
  - 基础支付集成（预留接口）

#### 部署编排服务 (Deployment Orchestrator Service)
- **职责**：Docker构建、Kubernetes部署、演示环境管理
- **技术**：Node.js + Express
- **端口**：3001
- **依赖**：Docker Engine, Kubernetes API
- **通信方式**：接收主应用的HTTP请求

### 3.2 服务间通信 (简化版)

#### 主应用 → 部署编排服务
- **协议**：HTTP/HTTPS + RESTful API
- **格式**：JSON
- **认证**：内部API Key
- **超时**：30秒（考虑到Docker构建时间）
- **重试机制**：简单重试（最多3次）

#### 通信场景
1. **创建演示环境**：主应用发送部署请求
2. **查询部署状态**：主应用轮询部署进度
3. **销毁环境**：主应用发送销毁请求
4. **健康检查**：定期检查服务可用性

### 3.3 AI辅助改造流程 (简化版)

#### 人工辅助模式
- **触发条件**：卖家上传非Docker化项目
- **处理流程**：
  1. 系统标记项目为"待改造"状态
  2. 技术人员下载项目到本地
  3. 使用AI编程工具（如GitHub Copilot、Cursor等）辅助生成Dockerfile
  4. 本地测试Docker构建和运行
  5. 将改造后的项目重新上传
  6. 进入正常审核流程

#### 预留扩展
- **自动化接口**：预留API接口供未来AI服务集成
- **改造记录**：记录改造过程和结果，用于后续优化
- **模板库**：积累常见项目类型的Docker化模板

### 3.4 支付系统集成 (预留设计)

#### MVP阶段
- **支付方式**：暂时支持单一支付渠道（如支付宝）
- **集成方式**：在主应用中直接集成支付SDK
- **功能范围**：基础的支付和退款功能
- **积分系统**：简化版积分记录和余额管理

#### 预留扩展
- **多支付渠道**：预留适配器模式接口
- **自动分账**：预留卖家收益分配功能
- **财务报表**：预留财务数据统计接口
- **风控系统**：预留支付风险控制模块

#### 实施建议
1. **第一阶段**：实现基础支付功能，满足MVP需求
2. **第二阶段**：根据业务发展需要，逐步完善支付功能
3. **第三阶段**：考虑拆分为独立的支付微服务

## 4. 数据架构设计

### 4.1 数据库设计原则
- **读写分离**：主库写入，从库读取
- **分库分表**：按业务模块和数据量分离
- **数据一致性**：最终一致性模型
- **备份策略**：每日全量备份 + 实时增量备份

### 4.2 核心数据模型

#### 用户相关表
```sql
-- 用户表
users (id, email, username, role, status, created_at, updated_at)

-- 用户配置表
user_profiles (user_id, avatar, bio, github_url, website, preferences)

-- 用户认证表
user_auth (user_id, password_hash, mfa_secret, last_login, login_attempts)
```

#### 项目相关表
```sql
-- 项目表
projects (id, seller_id, title, description, category, price, status, created_at)

-- 项目文件表
project_files (id, project_id, file_path, file_size, file_hash, storage_url)

-- 项目标签表
project_tags (project_id, tag_name)

-- 项目评价表
project_reviews (id, project_id, buyer_id, rating, comment, created_at)
```

#### 交易相关表
```sql
-- 订单表
orders (id, buyer_id, project_id, amount, status, payment_method, created_at)

-- 支付记录表
payments (id, order_id, amount, currency, provider, transaction_id, status)

-- 积分记录表
credits (id, user_id, amount, type, description, created_at)
```

### 4.3 缓存策略
- **用户会话**：Redis存储，TTL 24小时
- **项目列表**：Redis缓存，TTL 1小时
- **热门项目**：Redis缓存，TTL 30分钟
- **搜索结果**：Redis缓存，TTL 15分钟

## 5. 安全架构设计

### 5.1 认证授权
- **认证方式**：JWT Token + Refresh Token
- **授权模型**：RBAC (基于角色的访问控制)
- **Token有效期**：Access Token 1小时，Refresh Token 30天
- **多因素认证**：TOTP + SMS

### 5.2 API安全
- **HTTPS强制**：所有API必须使用HTTPS
- **CORS配置**：严格的跨域资源共享策略
- **限流控制**：每用户每分钟100次请求
- **输入验证**：所有输入数据严格验证

### 5.3 容器安全
- **镜像扫描**：使用Trivy扫描安全漏洞
- **运行时安全**：非root用户运行容器
- **网络隔离**：Kubernetes Network Policy
- **资源限制**：CPU和内存限制

### 5.4 数据安全
- **加密存储**：敏感数据AES-256加密
- **传输加密**：TLS 1.3
- **访问控制**：最小权限原则
- **审计日志**：所有操作记录日志

## 6. 部署架构设计 (简化版)

### 6.1 容器化策略

#### 主应用容器
```dockerfile
# 主应用Dockerfile示例
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/.next ./.next
EXPOSE 3000
CMD ["npm", "start"]
```

#### 部署编排服务容器
```dockerfile
# 部署编排服务Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### 6.2 Kubernetes部署 (简化版)

#### 主应用部署
```yaml
# 主应用部署配置
apiVersion: apps/v1
kind: Deployment
metadata:
  name: easy-code-main
spec:
  replicas: 2  # 简化为2个副本
  selector:
    matchLabels:
      app: easy-code-main
  template:
    metadata:
      labels:
        app: easy-code-main
    spec:
      containers:
      - name: main-app
        image: easy-code/main:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: DEPLOYMENT_SERVICE_URL
          value: "http://deployment-service:3001"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
# 部署编排服务
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deployment-service
spec:
  replicas: 1  # 单实例即可
  selector:
    matchLabels:
      app: deployment-service
  template:
    metadata:
      labels:
        app: deployment-service
    spec:
      containers:
      - name: deployment-service
        image: easy-code/deployment:latest
        ports:
        - containerPort: 3001
        env:
        - name: DOCKER_HOST
          value: "unix:///var/run/docker.sock"
        volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
      volumes:
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock
```

### 6.3 监控和日志
- **应用监控**：Prometheus + Grafana
- **日志收集**：Fluentd + Elasticsearch + Kibana
- **链路追踪**：Jaeger
- **告警通知**：AlertManager + 钉钉/邮件

## 7. 性能优化策略

### 7.1 前端优化
- **代码分割**：按路由和组件分割
- **懒加载**：图片和组件懒加载
- **CDN加速**：静态资源CDN分发
- **缓存策略**：浏览器缓存 + Service Worker

### 7.2 后端优化
- **数据库优化**：索引优化、查询优化
- **缓存策略**：多层缓存架构
- **连接池**：数据库连接池管理
- **异步处理**：耗时操作异步化

### 7.3 基础设施优化
- **负载均衡**：多实例负载均衡
- **自动扩缩容**：基于CPU和内存使用率
- **CDN优化**：全球CDN节点分布
- **数据库优化**：读写分离、分库分表

## 8. 灾难恢复和备份

### 8.1 备份策略
- **数据库备份**：每日全量 + 每小时增量
- **文件备份**：实时同步到多个存储节点
- **配置备份**：Git版本控制
- **镜像备份**：多个Registry备份

### 8.2 恢复策略
- **RTO目标**：4小时内恢复服务
- **RPO目标**：数据丢失不超过1小时
- **故障转移**：自动故障检测和切换
- **演练计划**：每季度灾难恢复演练
