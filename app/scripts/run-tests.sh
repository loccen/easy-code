#!/bin/bash

# Easy Code 测试运行脚本
# 用于快速运行全量测试，支持不同的测试模式

set -e

# 颜色定义
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

# 显示帮助信息
show_help() {
    echo "Easy Code 测试运行脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --quick, -q     快速测试模式（单元测试 + 简化E2E测试）"
    echo "  --unit, -u      只运行单元测试"
    echo "  --e2e, -e       只运行E2E测试"
    echo "  --coverage, -c  运行测试并生成覆盖率报告"
    echo "  --ci            CI模式（包含代码质量检查）"
    echo "  --setup         设置测试环境"
    echo "  --cleanup       清理测试数据"
    echo "  --help, -h      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --quick     # 快速测试"
    echo "  $0 --ci        # CI完整测试"
    echo "  $0 --coverage  # 生成覆盖率报告"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        log_error "package.json 不存在，请在项目根目录运行此脚本"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."
    npm ci
    log_success "依赖安装完成"
}

# 代码质量检查
quality_check() {
    log_info "运行代码质量检查..."
    
    log_info "ESLint 检查..."
    npm run lint
    
    log_info "TypeScript 检查..."
    npm run type-check
    
    log_success "代码质量检查通过"
}

# 运行单元测试
run_unit_tests() {
    local with_coverage=$1
    
    log_info "运行单元测试..."
    
    if [ "$with_coverage" = "true" ]; then
        npm run test:unit:coverage
        log_info "覆盖率报告已生成在 coverage/ 目录"
    else
        npm run test:unit
    fi
    
    log_success "单元测试完成"
}

# 设置测试环境
setup_test_environment() {
    log_info "设置测试环境..."
    npm run test:data setup
    log_success "测试环境设置完成"
}

# 清理测试数据
cleanup_test_data() {
    log_info "清理测试数据..."
    npm run test:data cleanup
    log_success "测试数据清理完成"
}

# 运行E2E测试
run_e2e_tests() {
    local quick_mode=$1
    
    log_info "运行E2E测试..."
    
    # 设置测试数据
    setup_test_environment
    
    # 运行测试
    if [ "$quick_mode" = "true" ]; then
        # 快速模式：只在一个浏览器上运行
        npm run test:e2e -- --project=chromium
    else
        # 完整模式：所有浏览器
        npm run test:e2e
    fi
    
    # 清理测试数据
    cleanup_test_data
    
    log_success "E2E测试完成"
}

# 主函数
main() {
    local mode=""
    local with_coverage=false
    local quick_mode=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick|-q)
                mode="quick"
                quick_mode=true
                shift
                ;;
            --unit|-u)
                mode="unit"
                shift
                ;;
            --e2e|-e)
                mode="e2e"
                shift
                ;;
            --coverage|-c)
                with_coverage=true
                shift
                ;;
            --ci)
                mode="ci"
                shift
                ;;
            --setup)
                mode="setup"
                shift
                ;;
            --cleanup)
                mode="cleanup"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 如果没有指定模式，默认为完整测试
    if [ -z "$mode" ]; then
        mode="full"
    fi
    
    # 记录开始时间
    start_time=$(date +%s)
    
    log_info "开始测试运行 - 模式: $mode"
    
    # 检查依赖
    check_dependencies
    
    # 根据模式执行不同的测试
    case $mode in
        "setup")
            setup_test_environment
            ;;
        "cleanup")
            cleanup_test_data
            ;;
        "unit")
            run_unit_tests $with_coverage
            ;;
        "e2e")
            run_e2e_tests $quick_mode
            ;;
        "quick")
            run_unit_tests false
            run_e2e_tests true
            ;;
        "ci")
            quality_check
            run_unit_tests true
            run_e2e_tests false
            ;;
        "full")
            run_unit_tests $with_coverage
            run_e2e_tests $quick_mode
            ;;
        *)
            log_error "未知模式: $mode"
            exit 1
            ;;
    esac
    
    # 计算运行时间
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    log_success "测试运行完成！总耗时: ${duration}秒"
}

# 运行主函数
main "$@"
