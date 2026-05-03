#!/usr/bin/env bash
# ============================================================
# Crypto Hermes Trader — 一键部署脚本
# 一条命令完成: 安装 Hermes + Docker 项目 + OKX MCP
# 适用系统: Ubuntu 24.04 LTS (全新安装)
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info()  { echo -e "${CYAN}[i]${NC} $1"; }

REPO_URL="https://github.com/hncdxs/crypto-hermes-trader.git"
PROJECT_DIR="/opt/crypto-hermes-trader"
HERMES_DIR="$HOME/.hermes/hermes-agent"
HERMES_CONFIG="$HOME/.hermes/config.yaml"
HERMES_VENV="$HERMES_DIR/venv"

# ============================================================
# 步骤 0: 检查系统
# ============================================================
check_system() {
    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║  🚀 Crypto Hermes Trader — 一键部署           ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""

    if [ "$(id -u)" -ne 0 ]; then
        error "请使用 root 用户运行 (sudo -i 或 su root)"
    fi

    if ! grep -qi "ubuntu\|debian" /etc/os-release 2>/dev/null; then
        error "仅支持 Ubuntu/Debian 系统"
    fi

    log "系统检查通过"
}

# ============================================================
# 步骤 1: 安装基础环境
# ============================================================
install_base() {
    info "➜ 步骤 1/7: 安装基础环境..."

    apt-get update -qq
    apt-get install -y -qq \
        curl wget git \
        python3 python3-pip python3-venv \
        ca-certificates gnupg lsb-release \
        ufw htop 2>&1 | tail -1

    # Docker
    if ! command -v docker &>/dev/null; then
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
            gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
            https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
            > /etc/apt/sources.list.d/docker.list
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
        log "Docker 安装完成"
    else
        log "Docker 已安装 ($(docker --version))"
    fi

    # Node.js
    if ! command -v node &>/dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt-get install -y -qq nodejs
        log "Node.js 安装完成 ($(node --version))"
    else
        log "Node.js 已安装 ($(node --version))"
    fi

    # 确保 Docker Compose 可用
    if ! docker compose version &>/dev/null; then
        apt-get install -y -qq docker-compose-plugin
    fi
    log "Docker Compose 已就绪"
}

# ============================================================
# 步骤 2: 安装 Hermes Agent
# ============================================================
install_hermes() {
    info "➜ 步骤 2/7: 安装 Hermes Agent..."

    if [ -d "$HERMES_DIR" ] && [ -f "$HERMES_VENV/bin/hermes" ]; then
        log "Hermes Agent 已安装"
        return
    fi

    mkdir -p "$HOME/.hermes"
    cd "$HOME/.hermes"

    if [ -d "$HERMES_DIR" ]; then
        cd "$HERMES_DIR"
        git pull --ff-only 2>/dev/null || true
    else
        git clone --depth 1 https://github.com/NousResearch/hermes-agent.git "$HERMES_DIR"
        cd "$HERMES_DIR"
    fi

    python3 -m venv "$HERMES_VENV"
    source "$HERMES_VENV/bin/activate"
    pip install --quiet -e . 2>&1 | tail -1
    deactivate

    log "Hermes Agent 安装完成 ($("$HERMES_VENV/bin/hermes" --version 2>&1 | head -1))"
}

# ============================================================
# 步骤 3: 配置 Hermes config.yaml
# ============================================================
configure_hermes() {
    info "➜ 步骤 3/7: 配置 Hermes config.yaml..."

    # 如果已存在且有我们加的内容就跳过
    if grep -q "crypto-hermes" "$HERMES_CONFIG" 2>/dev/null; then
        log "Hermes 配置已存在"
        return
    fi

    # 备份现有配置
    [ -f "$HERMES_CONFIG" ] && cp "$HERMES_CONFIG" "${HERMES_CONFIG}.bak"

    # 生成基础配置 + OKX MCP 占位
    cat > "$HERMES_CONFIG" << 'HERMES_EOF'
# Crypto Hermes Trader — Hermes Agent 配置
# 警告: 此文件由部署脚本管理，手动修改可能被覆盖

model:
  default: MiniMax-M2.7
  provider: openai
providers:
  openai:
    api_key: "YOUR_MINIMAX_API_KEY"   # 请替换为实际的 MiniMax API Key
    base_url: https://api.minimaxi.com/v1
fallback_providers: []
credential_pool_strategies: {}

agent:
  max_turns: 90
  gateway_timeout: 1800
  verbose: false
  tool_use_enforcement: auto
  reasoning_effort: medium

terminal:
  backend: local
  timeout: 180
  auto_source_bashrc: true

toolsets:
  - hermes-cli

# ── OKX MCP ─────────────────────────────────────────────────
# 初始化完成后，Web UI 会自动填充以下配置
mcp_servers: {}
# 示例（OKX 账户配置后在 Web UI 中设置）:
#   okx:
#     command: "npx"
#     args: ["-y", "@okx_ai/okx-trade-mcp", "--modules", "market,account,swap,spot,news", "--demo"]
#     env:
#       OKX_API_KEY: "..."
#       OKX_SECRET_KEY: "..."
#       OKX_PASSPHRASE: "..."

display:
  compact: false
  streaming: true
  personality: technical

cron:
  wrap_response: true
  max_parallel_jobs: null

memory:
  memory_enabled: true
  user_profile_enabled: true

delegation:
  inherit_mcp_toolsets: true
  max_iterations: 50
  child_timeout_seconds: 600
  max_concurrent_children: 3
HERMES_EOF

    log "Hermes 配置已生成（请在 Web UI 中配置 LLM 和 OKX）"
}

# ============================================================
# 步骤 4: 准备 OKX MCP
# ============================================================
prepare_okx_mcp() {
    info "➜ 步骤 4/7: 准备 OKX MCP..."

    # 预缓存 OKX MCP，避免首次启动慢
    if su - "$SUDO_USER" -c "npx -y @okx_ai/okx-trade-mcp@latest --help" 2>/dev/null | head -1; then
        log "OKX MCP 已缓存"
    else
        # 当前用户（root）下跑
        npx -y @okx_ai/okx-trade-mcp@latest --help > /dev/null 2>&1 || true
        log "OKX MCP 预缓存完成（账户配置请在 Web UI 中设置）"
    fi

    # 创建 OKX 配置目录
    mkdir -p "$HOME/.okx"
    cat > "$HOME/.okx/config.toml" << 'OKXEOF'
# OKX 账户配置
# 由 Web UI 初始化页面管理，请勿手动编辑
OKXEOF

    log "OKX 配置目录已就绪"
}

# ============================================================
# 步骤 5: 部署 Docker 项目
# ============================================================
deploy_project() {
    info "➜ 步骤 5/7: 部署项目代码..."

    if [ -d "$PROJECT_DIR" ]; then
        cd "$PROJECT_DIR"
        git pull --ff-only 2>&1 | tail -1
    else
        git clone --depth 1 "$REPO_URL" "$PROJECT_DIR"
        cd "$PROJECT_DIR"
    fi

    # 创建 .env 文件（如果没有）
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        cat > "$PROJECT_DIR/.env" << 'ENVEOF'
DATABASE_URL=postgresql+asyncpg://crypto:crypto_pass@postgres:5432/crypto_trader
ENVEOF
    fi

    log "项目代码已同步"
}

# ============================================================
# 步骤 6: Docker Compose 构建启动
# ============================================================
start_docker() {
    info "➜ 步骤 6/7: 构建并启动 Docker 服务..."

    cd "$PROJECT_DIR"

    # 如果已有旧容器，先清理
    docker compose down --remove-orphans 2>/dev/null || true

    # 构建并启动
    docker compose build 2>&1 | tail -2
    docker compose up -d 2>&1 | tail -2

    # 等待服务启动
    info "等待服务启动..."
    sleep 5

    # 检查后端
    if docker compose ps backend --format json | grep -q "running"; then
        log "后端服务运行中 (端口 8000)"
    else
        warn "后端启动中，请稍后用 docker compose logs backend 检查"
    fi

    # 检查前端
    if docker compose ps frontend --format json | grep -q "running"; then
        log "前端服务运行中 (端口 8080)"
    else
        warn "前端启动中，请稍后用 docker compose logs frontend 检查"
    fi
}

# ============================================================
# 步骤 7: 配置防火墙与安全
# ============================================================
configure_firewall() {
    info "➜ 步骤 7/7: 配置防火墙..."

    # 仅允许 HTTP/HTTPS/SSH
    ufw --force reset > /dev/null 2>&1 || true
    ufw default deny incoming > /dev/null 2>&1 || true
    ufw default allow outgoing > /dev/null 2>&1 || true
    ufw allow ssh > /dev/null 2>&1 || true
    ufw allow 80/tcp > /dev/null 2>&1 || true
    ufw allow 443/tcp > /dev/null 2>&1 || true
    ufw --force enable > /dev/null 2>&1 || true

    log "防火墙已配置 (仅允许 SSH, HTTP, HTTPS)"
}

# ============================================================
# 完成
# ============================================================
print_summary() {
    local ip
    ip=$(curl -s ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║  ✅ Crypto Hermes Trader 部署完成！           ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
    echo "  🌐 Web UI:      http://$ip:8080"
    echo "  🔧 后端 API:    http://$ip:8000"
    echo "  📁 项目目录:    $PROJECT_DIR"
    echo "  🤖 Hermes:      $HERMES_VENV/bin/hermes"
    echo ""
    echo "  首次使用请在浏览器中访问 Web UI 完成初始化:"
    echo "  1. 配置 LLM 模型 (DeepSeek/OpenAI/MiniMax)"
    echo "  2. 添加交易所账户 (OKX API Key)"
    echo ""
    echo "  后续维护命令:"
    echo "  ┌──────────────────────────────────────┐"
    echo "  │ cd $PROJECT_DIR                      │"
    echo "  │ docker compose logs -f       查看日志  │"
    echo "  │ docker compose pull          更新镜像  │"
    echo "  │ docker compose up -d         重启服务  │"
    echo "  │ docker compose down          停止服务  │"
    echo "  └──────────────────────────────────────┘"
    echo ""
    echo "  🚀 享受交易！"
    echo ""
}

# ============================================================
# 主流程
# ============================================================
main() {
    check_system
    install_base
    install_hermes
    configure_hermes
    prepare_okx_mcp
    deploy_project
    start_docker
    configure_firewall
    print_summary
}

main "$@"
