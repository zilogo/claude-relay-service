#!/bin/bash
# ================================================
# Claude Relay Service Docker Compose 自动化部署脚本
# 功能：生成包含完整功能和安全密钥的 docker-compose.yml 文件
# 支持：LDAP、用户管理、邮件服务、监控组件等所有功能
# 兼容：Ubuntu、CentOS、Debian 等主流 Linux 发行版
# ================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
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

print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() {
    echo -e "${MAGENTA}▶ $1${NC}"
}

# 检查必要的依赖
check_dependencies() {
    print_step "检查系统依赖..."

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
        echo -e "${YELLOW}现有文件将被备份为：${NC}docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)"
        echo ""
        echo -n "是否继续生成新的 docker-compose.yml？(y/n): "
        read -r choice
        case "$choice" in
            y|Y|yes|YES|Yes)
                # 备份现有文件
                backup_file="docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)"
                cp docker-compose.yml "$backup_file"
                print_success "已备份现有文件到：$backup_file"
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
    print_header "Claude Relay Service Docker Compose 自动化部署"
    echo ""
    print_info "这个脚本将为你生成包含完整功能的 Docker Compose 配置"
    print_info "包括：LDAP 认证、用户管理、邮件服务、监控组件等"
    echo ""

    # 1. 检查依赖
    check_dependencies
    echo ""

    # 2. 检查现有文件
    check_existing_compose
    echo ""

    # 3. 生成安全密钥
    print_step "生成安全密钥..."
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
    print_step "生成 docker-compose.yml 文件..."

cat > docker-compose.yml <<EOF
version: '3.8'

# Claude Relay Service Docker Compose 配置
# 自动生成时间：$(date '+%Y-%m-%d %H:%M:%S')
# 所有配置通过环境变量设置，可通过 .env 文件或直接设置环境变量

services:
  # 🚀 Claude Relay Service - 主服务
  claude-relay:
    build: .
    image: claude-relay-service:latest
    restart: unless-stopped
    ports:
      # 绑定地址：生产环境建议使用反向代理，设置 BIND_HOST=127.0.0.1
      - '\${BIND_HOST:-0.0.0.0}:\${PORT:-3000}:3000'
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    environment:
      # 🌐 服务器配置
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0

      # 🔐 安全配置（必填 - 已自动生成）
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - ADMIN_SESSION_TIMEOUT=\${ADMIN_SESSION_TIMEOUT:-86400000}
      - API_KEY_PREFIX=\${API_KEY_PREFIX:-cr_}

      # 👤 管理员凭据（可选 - 首次启动会自动生成）
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
      - PROXY_USE_IPV4=\${PROXY_USE_IPV4:-true}
      - REQUEST_TIMEOUT=\${REQUEST_TIMEOUT:-600000}

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
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3

  # 📊 Redis Database
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    # 仅在容器网络内部暴露端口，不映射到主机
    expose:
      - '6379'
    volumes:
      - ./redis_data:/data
    command: redis-server --save 60 1 --appendonly yes --appendfsync everysec
    networks:
      - claude-relay-network
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 3

  # 📈 Redis Monitoring - Redis Commander
  redis-commander:
    image: rediscommander/redis-commander:latest
    restart: unless-stopped
    ports:
      - '127.0.0.1:\${REDIS_WEB_PORT:-8081}:8081'
    environment:
      - REDIS_HOSTS=local:redis:6379
    depends_on:
      - redis
    networks:
      - claude-relay-network

  # 📊 Application Monitoring - Prometheus
  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - '127.0.0.1:\${PROMETHEUS_PORT:-9090}:9090'
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - claude-relay-network

  # 📈 Grafana Dashboard
  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - '127.0.0.1:\${GRAFANA_PORT:-3001}:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_ADMIN_PASSWORD:-admin123}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana:/etc/grafana/provisioning
    depends_on:
      - prometheus
    networks:
      - claude-relay-network

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

        # 显示密钥信息
        print_header "🔑 生成的安全密钥信息"
        echo ""
        echo -e "${CYAN}JWT_SECRET:${NC}"
        echo -e "${GREEN}${JWT_SECRET}${NC}"
        echo ""
        echo -e "${CYAN}ENCRYPTION_KEY:${NC}"
        echo -e "${GREEN}${ENCRYPTION_KEY}${NC}"
        echo ""

        print_warning "请妥善保存以上密钥信息！"
        print_warning "如果丢失密钥，Redis 中的加密数据将无法解密！"
        echo ""

        # 使用说明
        print_header "📚 使用说明"
        echo ""
        print_info "1. 构建并启动所有服务（包括监控组件）："
        echo -e "   ${CYAN}docker-compose build${NC}"
        echo -e "   ${CYAN}docker-compose up -d${NC}"
        echo ""

        print_info "2. 仅启动核心服务（不包括监控）："
        echo -e "   ${CYAN}docker-compose up -d claude-relay redis${NC}"
        echo ""

        print_info "3. 查看服务日志："
        echo -e "   ${CYAN}docker-compose logs -f${NC}"
        echo -e "   ${CYAN}docker-compose logs -f claude-relay${NC}  # 仅查看主服务日志"
        echo ""

        print_info "4. 停止服务："
        echo -e "   ${CYAN}docker-compose down${NC}"
        echo ""

        print_info "5. 访问各个服务："
        echo -e "   - 主服务：        ${CYAN}http://localhost:3000${NC}"
        echo -e "   - Web 管理界面：  ${CYAN}http://localhost:3000/admin-next/${NC}"
        echo -e "   - Redis Commander: ${CYAN}http://localhost:8081${NC}"
        echo -e "   - Prometheus:      ${CYAN}http://localhost:9090${NC}"
        echo -e "   - Grafana:         ${CYAN}http://localhost:3001${NC}"
        echo ""

        print_header "⚙️  高级配置"
        echo ""
        print_info "如需自定义配置，可以："
        echo ""
        echo -e "1. 创建 ${CYAN}.env${NC} 文件并设置环境变量："
        echo -e "   ${CYAN}cp .env.example .env${NC}  # 如果项目提供了示例文件"
        echo ""
        echo -e "2. 或直接在 shell 中设置环境变量："
        echo -e "   ${CYAN}export PORT=8080${NC}"
        echo -e "   ${CYAN}export LOG_LEVEL=debug${NC}"
        echo ""
        echo -e "3. 重要功能开关："
        echo -e "   - LDAP 认证：     ${CYAN}LDAP_ENABLED=true${NC}"
        echo -e "   - 用户管理：      ${CYAN}USER_MANAGEMENT_ENABLED=true${NC}"
        echo -e "   - 邮件服务：      ${CYAN}EMAIL_ENABLED=true${NC}"
        echo -e "   - HTTP 调试日志： ${CYAN}DEBUG_HTTP_TRAFFIC=true${NC}"
        echo ""

        print_success "🎉 配置生成完成！祝你使用愉快！"
        echo ""
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
