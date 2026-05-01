# Crypto AI Trader

🤖 AI 驱动的加密货币自动交易系统（永续合约）

用自然语言写策略，AI Agent 自动执行交易，全过程可视化看板。

## 快速开始

### 环境要求

- Docker & Docker Compose
- Node.js >= 18（用于 OKX Trade Kit）

### 一键部署

```bash
# 1. 克隆项目
git clone https://github.com/hncdxs/crypto-ai-trader.git
cd crypto-ai-trader

# 2. 启动（会自动安装依赖）
docker compose up -d

# 3. 打开浏览器
# http://localhost:8080
```

### 首次使用

1. 打开 Web UI → **项目初始化**
2. 填入 LLM API Key（默认 MiniMax 国内版）
3. 添加 OKX 交易所账户（模拟盘/实盘）
4. 系统自动安装 OKX Trade Kit
5. 创建策略 → 创建交易员 → 启动 🚀

## 架构

```
Web UI (React) ←→ FastAPI ←→ PostgreSQL
                      ↓
            Hermes Agent (AI大脑)
              ├── 主代理
              ├── 盯盘代理
              ├── 下单代理
              └── 风控代理
                      ↓
            OKX MCP Server (交易执行)
                      ↓
            OKX 交易所 (模拟盘/实盘)
```

## 功能

| 功能 | 说明 |
|------|------|
| 📝 策略编辑器 | Markdown 写策略，支持版本迭代 |
| 🤖 多 Agent | 盯盘/下单/风控，子代理 LLM 可切换 |
| 📊 决策看板 | 实时展示 AI 决策流程和思维链 |
| 📈 历史复盘 | 所有决策、订单、盈亏记录可回溯 |
| 🔌 插件架构 | 预留回测、策略生成等扩展接口 |
| 🔐 双账户 | 模拟盘+实盘，Web UI 管理 API Key |

## 插件架构

项目采用插件化设计，未来功能可直接通过插件添加：

- `plugins/backtesting/` — 【预留】策略回测
- `plugins/strategy_generator/` — 【预留】AI 策略生成
- `plugins/notifications/` — 【预留】通知模块

详见 [ARCHITECTURE.md](ARCHITECTURE.md)

## 技术栈

- **AI 引擎：** Hermes Agent + MiniMax M2.5 / DeepSeek
- **交易所：** OKX Agent Trade Kit (MCP)
- **后端：** FastAPI (Python)
- **前端：** React + TradingView Charts
- **数据库：** PostgreSQL
- **部署：** Docker Compose

## License

MIT
