#!/bin/bash
# ================================================
# Claude Relay Service Docker Compose 生成脚本
# 功能：生成包含安全密钥的 docker-compose.yml 文件
# 兼容：Ubuntu、CentOS、Debian 等主流 Linux 发行版
# ================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色信息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查必要的依赖
check_dependencies() {
    print_info "检查系统依赖..."
    
    # 检查 openssl
    if ! command -v openssl &> /dev/null; then
        print_error "openssl 未安装"
        print_info "正在尝试安装 openssl..."
        
        # 检测系统类型并安装 openssl
        if command -v apt-get &> /dev/null; then
            # Debian/Ubuntu
            sudo apt-get update && sudo apt-get install -y openssl
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL 7
            sudo yum install -y openssl
        elif command -v dnf &> /dev/null; then
            # CentOS/RHEL 8+/Fedora
            sudo dnf install -y openssl
        elif command -v zypper &> /dev/null; then
            # openSUSE
            sudo zypper install -y openssl
        elif command -v pacman &> /dev/null; then
            # Arch Linux
            sudo pacman -S openssl
        else
            print_error "无法自动安装 openssl，请手动安装后重试"
            exit 1
        fi
        
        # 再次检查
        if ! command -v openssl &> /dev/null; then
            print_error "openssl 安装失败，请手动安装"
            exit 1
        fi
    fi
    
    print_success "依赖检查完成"
}

# 检查是否存在 docker-compose.yml
check_existing_compose() {
    if [[ -f "docker-compose.yml" ]]; then
        print_warning "检测到当前目录已存在 docker-compose.yml 文件"
        print_warning "重新生成会创建新的加密密钥，可能导致 Redis 中的数据无法解密"
        echo ""
        echo -n "是否继续生成新的 docker-compose.yml？(y/n): "
        read -r choice
        case "$choice" in
            y|Y|yes|YES|Yes)
                print_info "继续生成新文件..."
                ;;
            *)
                print_info "操作已取消"
                exit 0
                ;;
        esac
    fi
}

# 安全的随机字符串生成函数（32字节，Base64编码）
# 使用多种方法确保跨系统兼容性
gen_random() {
    local random_string
    
    # 方法1：使用 openssl（最通用）
    if command -v openssl &> /dev/null; then
        random_string=$(openssl rand -base64 48 2>/dev/null | tr -d '=+/\n ' | cut -c1-32)
    fi
    
    # 方法2：如果 openssl 失败，使用 /dev/urandom
    if [[ -z "$random_string" ]] && [[ -r /dev/urandom ]]; then
        random_string=$(head -c 32 /dev/urandom | base64 | tr -d '=+/\n ' | cut -c1-32)
    fi
    
    # 方法3：使用 RANDOM（最后备选）
    if [[ -z "$random_string" ]]; then
        random_string=$(for i in {1..32}; do printf "%X" $((RANDOM % 16)); done)
    fi
    
    # 验证生成的密钥长度
    if [[ ${#random_string} -lt 32 ]]; then
        # 如果长度不足，补充随机字符
        while [[ ${#random_string} -lt 32 ]]; do
            random_string+=$(printf "%X" $((RANDOM % 16)))
        done
        random_string=${random_string:0:32}
    fi
    
    echo "$random_string"
}

# 主执行流程
main() {
    print_info "开始生成 Claude Relay Service Docker Compose 配置"
    echo ""
    
    # 1. 检查依赖
    check_dependencies
    echo ""
    
    # 2. 检查现有文件
    check_existing_compose
    echo ""
    
    # 3. 生成安全密钥
    print_info "生成安全密钥..."
    JWT_SECRET=$(gen_random)
    ENCRYPTION_KEY=$(gen_random)
    
    # 验证密钥生成成功
    if [[ -z "$JWT_SECRET" ]] || [[ -z "$ENCRYPTION_KEY" ]]; then
        print_error "密钥生成失败"
        exit 1
    fi
    
    print_success "密钥生成成功"
    echo ""
    
    # 4. 生成 docker-compose.yml 文件
    print_info "生成 docker-compose.yml 文件..."
    
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  # 🚀 Claude Relay Service
  claude-relay:
    build: .
    image: claude-relay-service:local
    restart: unless-stopped
    ports:
      - "\${BIND_HOST:-0.0.0.0}:\${PORT:-3000}:3000"
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    environment:
      # 🌐 服务器配置
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0

      # 🔐 安全配置（必填）
      - JWT_SECRET=${JWT_SECRET} # 必填：至少32字符的随机字符串
      - ENCRYPTION_KEY=${ENCRYPTION_KEY} # 必填：32字符的加密密钥
      - ADMIN_SESSION_TIMEOUT=\${ADMIN_SESSION_TIMEOUT:-86400000}
      - API_KEY_PREFIX=\${API_KEY_PREFIX:-cr_}

      # 👤 管理员凭据（可选）
      - ADMIN_USERNAME=\${ADMIN_USERNAME:-}
      - ADMIN_PASSWORD=\${ADMIN_PASSWORD:-}

      # 📊 Redis 配置
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=\${REDIS_PASSWORD:-}
      - REDIS_DB=\${REDIS_DB:-0}
      - REDIS_ENABLE_TLS=\${REDIS_ENABLE_TLS:-}

      # 🎯 Claude API 配置
      - CLAUDE_API_URL=\${CLAUDE_API_URL:-https://api.anthropic.com/v1/messages}
      - CLAUDE_API_VERSION=\${CLAUDE_API_VERSION:-2023-06-01}
      - CLAUDE_BETA_HEADER=\${CLAUDE_BETA_HEADER:-claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14}

      # 🌐 代理配置
      - DEFAULT_PROXY_TIMEOUT=\${DEFAULT_PROXY_TIMEOUT:-60000}
      - MAX_PROXY_RETRIES=\${MAX_PROXY_RETRIES:-3}

      # 📈 使用限制
      - DEFAULT_TOKEN_LIMIT=\${DEFAULT_TOKEN_LIMIT:-1000000}

      # 📝 日志配置
      - LOG_LEVEL=\${LOG_LEVEL:-info}
      - LOG_MAX_SIZE=\${LOG_MAX_SIZE:-10m}
      - LOG_MAX_FILES=\${LOG_MAX_FILES:-5}

      # 🔧 系统配置
      - CLEANUP_INTERVAL=\${CLEANUP_INTERVAL:-3600000}
      - TOKEN_USAGE_RETENTION=\${TOKEN_USAGE_RETENTION:-2592000000}
      - HEALTH_CHECK_INTERVAL=\${HEALTH_CHECK_INTERVAL:-60000}
      - TIMEZONE_OFFSET=\${TIMEZONE_OFFSET:-8}
      - METRICS_WINDOW=\${METRICS_WINDOW:-5}

      # 🔗 会话管理配置
      - STICKY_SESSION_TTL_HOURS=\${STICKY_SESSION_TTL_HOURS:-1}
      - STICKY_SESSION_RENEWAL_THRESHOLD_MINUTES=\${STICKY_SESSION_RENEWAL_THRESHOLD_MINUTES:-15}

      # 🚫 错误处理配置
      - CLAUDE_OVERLOAD_HANDLING_MINUTES=\${CLAUDE_OVERLOAD_HANDLING_MINUTES:-0}
      - CLAUDE_CONSOLE_BLOCKED_HANDLING_MINUTES=\${CLAUDE_CONSOLE_BLOCKED_HANDLING_MINUTES:-10}

      # 🌐 高级代理配置
      - PROXY_USE_IPV4=\${PROXY_USE_IPV4:-true}
      - REQUEST_TIMEOUT=\${REQUEST_TIMEOUT:-600000}

      # 🎨 Web 界面配置
      - WEB_TITLE=\${WEB_TITLE:-AI TokenCloud Service}
      - WEB_DESCRIPTION=\${WEB_DESCRIPTION:-AI TokenCloud Service}
      - WEB_LOGO_URL=\${WEB_LOGO_URL:-/assets/logo.png}

      # 🛠️ 开发配置
      - DEBUG=\${DEBUG:-false}
      - DEBUG_HTTP_TRAFFIC=\${DEBUG_HTTP_TRAFFIC:-false}
      - ENABLE_CORS=\${ENABLE_CORS:-true}
      - TRUST_PROXY=\${TRUST_PROXY:-true}

      # 🔐 LDAP 认证配置
      - LDAP_ENABLED=\${LDAP_ENABLED:-false}
      - LDAP_URL=\${LDAP_URL:-}
      - LDAP_BIND_DN=\${LDAP_BIND_DN:-}
      - LDAP_BIND_PASSWORD=\${LDAP_BIND_PASSWORD:-}
      - LDAP_SEARCH_BASE=\${LDAP_SEARCH_BASE:-}
      - LDAP_SEARCH_FILTER=\${LDAP_SEARCH_FILTER:-(uid={{username}})}
      - LDAP_SEARCH_ATTRIBUTES=\${LDAP_SEARCH_ATTRIBUTES:-dn,uid,cn,mail,givenName,sn}
      - LDAP_TIMEOUT=\${LDAP_TIMEOUT:-5000}
      - LDAP_CONNECT_TIMEOUT=\${LDAP_CONNECT_TIMEOUT:-10000}
      - LDAP_TLS_REJECT_UNAUTHORIZED=\${LDAP_TLS_REJECT_UNAUTHORIZED:-true}
      - LDAP_USER_ATTR_USERNAME=\${LDAP_USER_ATTR_USERNAME:-uid}
      - LDAP_USER_ATTR_DISPLAY_NAME=\${LDAP_USER_ATTR_DISPLAY_NAME:-cn}
      - LDAP_USER_ATTR_EMAIL=\${LDAP_USER_ATTR_EMAIL:-mail}
      - LDAP_USER_ATTR_FIRST_NAME=\${LDAP_USER_ATTR_FIRST_NAME:-givenName}
      - LDAP_USER_ATTR_LAST_NAME=\${LDAP_USER_ATTR_LAST_NAME:-sn}

      # 👥 用户管理配置
      - USER_MANAGEMENT_ENABLED=\${USER_MANAGEMENT_ENABLED:-true}
      - DEFAULT_USER_ROLE=\${DEFAULT_USER_ROLE:-user}
      - USER_SESSION_TIMEOUT=\${USER_SESSION_TIMEOUT:-86400000}
      - MAX_API_KEYS_PER_USER=\${MAX_API_KEYS_PER_USER:-1}
      - ALLOW_USER_DELETE_API_KEYS=\${ALLOW_USER_DELETE_API_KEYS:-true}

      # 🔑 本地认证配置
      - LOCAL_AUTH_ENABLED=\${LOCAL_AUTH_ENABLED:-true}
      - ALLOW_SELF_REGISTRATION=\${ALLOW_SELF_REGISTRATION:-true}
      - PASSWORD_MIN_LENGTH=\${PASSWORD_MIN_LENGTH:-8}
      - PASSWORD_MAX_LENGTH=\${PASSWORD_MAX_LENGTH:-128}
      - REQUIRE_PASSWORD_CHANGE=\${REQUIRE_PASSWORD_CHANGE:-false}

      # 📧 邮件服务配置
      - EMAIL_ENABLED=\${EMAIL_ENABLED:-false}
      - EMAIL_SERVICE_TYPE=\${EMAIL_SERVICE_TYPE:-smtp}
      - SMTP_HOST=\${SMTP_HOST:-}
      - SMTP_PORT=\${SMTP_PORT:-465}
      - SMTP_SECURE=\${SMTP_SECURE:-true}
      - SMTP_USER=\${SMTP_USER:-}
      - SMTP_PASS=\${SMTP_PASS:-}
      - EMAIL_FROM_NAME=\${EMAIL_FROM_NAME:-Claude Relay Service}
      - EMAIL_FROM_ADDRESS=\${EMAIL_FROM_ADDRESS:-}
      - BASE_URL=\${BASE_URL:-http://localhost:3000}
      - REQUIRE_EMAIL_VERIFICATION=\${REQUIRE_EMAIL_VERIFICATION:-false}
      - ALLOW_PASSWORD_RESET=\${ALLOW_PASSWORD_RESET:-true}
      - EMAIL_RATE_LIMIT_WINDOW=\${EMAIL_RATE_LIMIT_WINDOW:-600}
      - EMAIL_RATE_LIMIT_MAX=\${EMAIL_RATE_LIMIT_MAX:-3}
      - EMAIL_VERIFICATION_TOKEN_TTL=\${EMAIL_VERIFICATION_TOKEN_TTL:-86400}
      - PASSWORD_RESET_TOKEN_TTL=\${PASSWORD_RESET_TOKEN_TTL:-3600}

    depends_on:
      - redis
    networks:
      - claude-relay-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 📊 Redis Database
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    expose:
      - "6379"
    volumes:
      - ./redis_data:/data
    command: redis-server --save 60 1 --appendonly yes --appendfsync everysec
    networks:
      - claude-relay-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  claude-relay-network:
    driver: bridge
EOF
    
    # 检查文件是否成功生成
    if [[ -f "docker-compose.yml" ]]; then
        print_success "docker-compose.yml 文件生成完成"
        echo ""
        print_info "生成的密钥信息："
        echo "🔑 JWT_SECRET: $JWT_SECRET"
        echo "🔑 ENCRYPTION_KEY: $ENCRYPTION_KEY"
        echo ""
        print_warning "请妥善保存以上密钥信息！"
        print_info "如果需要备份配置，请复制整个 docker-compose.yml 文件"
        echo ""
        print_info "使用方法："
        echo "  docker-compose up -d    # 启动服务"
        echo "  docker-compose down     # 停止服务"
        echo "  docker-compose logs -f  # 查看日志"
    else
        print_error "docker-compose.yml 文件生成失败"
        exit 1
    fi
}

# 错误处理函数
handle_error() {
    print_error "脚本执行过程中发生错误（第 $1 行）"
    print_info "请检查错误信息并重试"
    exit 1
}

# 设置错误处理
trap 'handle_error $LINENO' ERR

# 执行主函数
main "$@"
