#!/bin/bash

# 易码网 Supabase 部署脚本
# 自动化配置Supabase项目的数据库和认证设置

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的环境变量
check_env() {
    log_info "检查环境变量..."
    
    if [ -z "$SUPABASE_PROJECT_ID" ]; then
        log_error "请设置 SUPABASE_PROJECT_ID 环境变量"
        exit 1
    fi
    
    if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        log_error "请设置 SUPABASE_ACCESS_TOKEN 环境变量"
        exit 1
    fi
    
    log_success "环境变量检查完成"
}

# 执行SQL脚本
execute_sql() {
    local script_name=$1
    local description=$2
    
    log_info "执行 $description..."
    
    if [ ! -f "$script_name" ]; then
        log_error "脚本文件 $script_name 不存在"
        exit 1
    fi
    
    # 读取SQL文件内容
    local sql_content=$(cat "$script_name")
    
    # 通过API执行SQL
    local response=$(curl -s -X POST \
        "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/database/query" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$sql_content" | jq -Rs .)}")
    
    # 检查响应
    if echo "$response" | jq -e '.error' > /dev/null; then
        log_error "$description 执行失败: $(echo "$response" | jq -r '.error')"
        exit 1
    fi
    
    log_success "$description 执行成功"
}

# 配置认证设置
configure_auth() {
    log_info "配置认证设置..."
    
    # 禁用邮箱确认（开发环境）
    log_info "设置邮箱自动确认..."
    curl -s -X PATCH \
        "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/config/auth" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"mailer_autoconfirm": true}' > /dev/null
    
    # 设置站点URL
    log_info "设置站点URL..."
    curl -s -X PATCH \
        "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/config/auth" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"site_url": "http://localhost:3000"}' > /dev/null
    
    # 启用注册
    log_info "启用用户注册..."
    curl -s -X PATCH \
        "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/config/auth" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"disable_signup": false}' > /dev/null
    
    # 设置密码最小长度
    log_info "设置密码要求..."
    curl -s -X PATCH \
        "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/config/auth" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"password_min_length": 6}' > /dev/null
    
    log_success "认证设置配置完成"
}

# 主函数
main() {
    log_info "开始部署易码网 Supabase 配置..."
    
    # 检查环境变量
    check_env
    
    # 执行数据库脚本
    execute_sql "setup-database.sql" "数据库表结构创建"
    execute_sql "setup-rls.sql" "行级安全策略设置"
    execute_sql "setup-auth-config.sql" "认证配置和触发器"
    
    # 配置认证设置
    configure_auth
    
    log_success "易码网 Supabase 配置部署完成！"
    log_info "请更新 .env.local 文件中的 Supabase 配置信息"
}

# 使用说明
usage() {
    echo "易码网 Supabase 部署脚本"
    echo ""
    echo "使用方法:"
    echo "  export SUPABASE_PROJECT_ID=your_project_id"
    echo "  export SUPABASE_ACCESS_TOKEN=your_access_token"
    echo "  ./deploy-supabase.sh"
    echo ""
    echo "环境变量:"
    echo "  SUPABASE_PROJECT_ID    - Supabase 项目 ID"
    echo "  SUPABASE_ACCESS_TOKEN  - Supabase 访问令牌"
    echo ""
}

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    usage
    exit 0
fi

# 执行主函数
main
