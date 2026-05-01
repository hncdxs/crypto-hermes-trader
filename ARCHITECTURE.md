# Crypto AI Trader — 架构设计文档

> **项目节点：** 2026-05-01，方向确认
> **版本：** v2 — 新增插件化架构设计
> **下次阅读请从头看起，保持上下文一致**

---

## 一、项目定位

- **用户：** 个人使用，后续可能开源 (MIT)
- **部署：** 8核8G 云服务器，24h 不间断运行
- **核心理念：** AI Agent 自动交易系统，用自然语言写策略，全过程可视化
- **架构哲学：** 模块化、插件化，预留扩展接口，方便未来添加功能

---

## 二、整体架构

```
浏览器 (Web UI)  ←HTTP/WS→  FastAPI + React  ←SQL→  PostgreSQL
                                ↓
                    🤖 Hermes Agent (AI大脑)
                     ├── 👑 主代理 (读取策略MD, 调度)
                     ├── 🔍 盯盘代理 (N个交易对轮询)
                     ├── ⚡ 下单代理 (执行交易)
                     └── 🛡️ 风控代理 (监控风险)
                                ↓
                    🔌 OKX MCP Server (交易执行)
                                ↓
                    🌐 OKX 交易所 (模拟盘/实盘)
```

---

## 三、插件化架构（核心设计）

### 3.1 为什么从一开始就要做插件化？

未来可能新增的功能（尚不确定，但预留好了）：

| 未来功能 | 需要的扩展点 |
|----------|-------------|
| **策略回测** | 回测引擎、历史数据源、回测看板 |
| **AI 自动生成策略** | 策略生成器、历史K线分析模块 |
| **多交易所** (币安/Gate等) | 交易所抽象层、新 MCP 适配器 |
| **Telegram/飞书通知** | 通知通道插件 |
| **策略市场** (复制别人的策略) | 策略导入/导出、市场模块 |
| **绩效报告** (PDF导出) | 报表生成器 |

### 3.2 插件系统架构

```
crypto-ai-trader/
├── core/                      ← 核心框架（不可插拔）
│   ├── database.py            # 数据库连接
│   ├── websocket_manager.py   # WebSocket 推送
│   ├── config_manager.py      # 配置管理
│   └── plugin_loader.py       # 插件加载器 ← 核心！
│
├── plugins/                   ← 插件目录（每个独立模块）
│   ├── __init__.py
│   │
│   ├── exchange_okx/          # OKX 交易所插件
│   │   ├── __init__.py
│   │   ├── models.py          # OKX 特有的数据模型
│   │   ├── mcp_client.py      # MCP 客户端封装
│   │   └── api_routes.py      # OKX 相关的 API 路由
│   │
│   ├── trader_hermes/         # Hermes 交易员插件
│   │   ├── __init__.py
│   │   ├── master_agent.py    # 主代理
│   │   ├── monitor_agent.py   # 盯盘代理
│   │   ├── exec_agent.py      # 下单代理
│   │   └── risk_agent.py      # 风控代理
│   │
│   ├── strategy_editor/       # 策略编辑器插件
│   │   ├── __init__.py
│   │   └── editor.py
│   │
│   ├── dashboard/             # 看板插件
│   │   ├── __init__.py
│   │   └── views.py
│   │
│   ├── llm_minimax/           # MiniMax LLM 适配器
│   │   ├── __init__.py
│   │   └── adapter.py
│   │
│   ├── backtesting/           # 【预留】回测模块
│   │   └── __init__.py        # 接口已定义，功能待实现
│   │
│   ├── strategy_generator/    # 【预留】AI 策略生成模块
│   │   └── __init__.py        # 接口已定义，功能待实现
│   │
│   └── notifications/         # 【预留】通知模块
│       └── __init__.py        # 接口已定义，功能待实现
│
├── frontend/                  # React 前端
│   ├── src/
│   │   ├── pages/             # 页面路由
│   │   ├── components/        # 通用组件
│   │   └── plugins/           # 前端插件注册
│   │       ├── plugin_registry.ts  # 前端插件注册表
│   │       ├── DashboardPlugin.tsx  # 看板插件
│   │       ├── StrategyPlugin.tsx   # 策略插件
│   │       └── ...            # 未来插件
│   └── ...
│
└── docker-compose.yml
```

### 3.3 插件接口定义（Python 后端）

每个插件必须实现一个标准接口：

```python
# core/plugin_loader.py

class BasePlugin(ABC):
    """所有插件的基类"""
    
    @abstractmethod
    def get_info(self) -> dict:
        """返回插件信息：名称、版本、描述"""
        pass
    
    @abstractmethod
    def register_routes(self, router: APIRouter):
        """注册 API 路由"""
        pass
    
    def register_websocket(self, manager: WebSocketManager):
        """可选：注册 WebSocket 事件"""
        pass
    
    def on_startup(self, app: FastAPI):
        """可选：应用启动时初始化"""
        pass
    
    def on_shutdown(self, app: FastAPI):
        """可选：应用关闭时清理"""
        pass
```

### 3.4 前端插件接口

```typescript
// frontend/src/plugins/plugin_registry.ts

interface Plugin {
  id: string;
  name: string;
  version: string;
  
  // 该插件需要注册哪些导航菜单
  navItems?: { path: string; label: string; icon: string }[];
  
  // 该插件需要在哪些页面注入组件
  pageExtensions?: {
    dashboard?: React.ComponentType;      // 看板页注入
    strategyEditor?: React.ComponentType;  // 策略编辑页注入
    settings?: React.ComponentType;        // 设置页注入
  };
  
  // 该插件需要在前端添加的 API 调用
  apiEndpoints?: string[];
}
```

### 3.5 插件的生命周期

```
系统启动
    │
    ├── 扫描 plugins/ 目录
    │
    ├── 加载每个 BasePlugin 实现
    │       │
    │       ├── 调用 on_startup()     → 初始化数据库表、连接资源
    │       ├── 调用 register_routes() → 注册 /api/xxx 路由
    │       └── 调用 register_websocket() → 注册 ws 事件
    │
    ├── React 前端启动时
    │       │
    │       ├── GET /api/plugins       → 获取已安装的插件列表
    │       └── 动态注册导航菜单和组件
    │
    └── 系统关闭
            └── 调用 on_shutdown()    → 清理资源
```

---

## 四、Web UI 页面框架

### 4.1 导航结构

```
【项目初始化】  →  首次使用必走流程（LLM配置、OKX安装、账户添加、子代理创建）
【策  略】     →  写策略、管理版本、迭代
【交易员】     →  创建/管理交易员实例
【看  板】     →  实时监控决策流程和持仓
【⚙️ 设置】    →  LLM切换、账户管理、插件管理
```

### 4.2 动态导航

导航栏根据已安装的插件动态生成：

| 导航项 | 来源 |
|--------|------|
| 项目初始化 | 核心模块 |
| 策略 | 策略编辑器插件 |
| 交易员 | 交易员插件 |
| 看板 | 看板插件 |
| **回测** *(未来)* | 回测插件 → 自动出现 |
| **策略生成器** *(未来)* | 策略生成插件 → 自动出现 |

### 4.3 页面详细设计

#### 页面 1：项目初始化

> **给项目注入灵魂** — 首次打开时的必经流程，后续可在设置中修改

```
┌──────────────────────────────────────────────────────┐
│  🚀 项目初始化                                        │
│                                                       │
│  ── 1. 配置 LLM（灵魂注入） ──                         │
│                                                       │
│  LLM 提供商: [MiniMax(国内版) ▼]                       │
│  API Key:    [________________________]  🔑          │
│  Model:      [MiniMax-M2.7 ▼]                         │
│  Base URL:   https://api.minimaxi.com/anthropic       │
│               ↑ 自动填充，不可编辑（只读展示）           │
│                                                       │
│  ⚡ 提示: 可随时在右上角切换 LLM                        │
│                                                       │
│  ── 2. OKX AI Trade Kit ──                             │
│                                                       │
│  ⬜ 检测 OKX Trade Kit 状态...                          │
│  ✅ Node.js 已安装                                     │
│  ⏳ 正在安装 okx-trade-mcp / okx-trade-cli...          │
│                                                       │
│  ── 3. 交易所账户 ──                                    │
│                                                       │
│  📋 已添加的 OKX 账户:                                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 名称: 模拟盘-01       类型: 模拟盘  🌐 global    │ │
│  │ API Key: okx-xxx...  状态: ✅ 已验证             │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ 名称: 实盘-主账户     类型: 实盘    🌐 global    │ │
│  │ API Key: okx-yyy...  状态: ✅ 已验证             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  [+ 添加交易所账户]  (名称 / 类型:模拟盘or实盘 / API  │
│    Key / Secret Key / Passphrase / 站点:global/eea/us)│
│                                                       │
│  ── 4. 创建默认子代理 ──                                │
│                                                       │
│  系统将自动创建以下子代理:                               │
│  🤖 主代理       — 读取策略、调度任务                    │
│  🔍 盯盘代理     — 监控N个交易对，检查条件               │
│  ⚡ 下单代理     — 执行交易，挂止盈止损                  │
│  🛡️ 风控代理     — 风险监控，紧急平仓                   │
│                                                       │
│  ✅ 所有子代理共用主 LLM                                │
│  ⚙️ 也可为重要子代理单独配置备用 LLM                    │
│                                                       │
│  ───────────────────────────────────────               │
│  [🚀 完成初始化]                                       │
└──────────────────────────────────────────────────────┘
```

#### 页面 2：策略管理

```
┌──────────────────────────────────────────────────────┐
│  ← 返回   策略管理                                     │
│                                                       │
│  所有策略:                                            │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 📄 VegasMeanReversion (维加斯均值回归)            │ │
│  │   ├─ v1  [2026-05-01] ← 原始版本                 │ │
│  │   └─ v2  [2026-05-02] ← 最新版本 ← 使用中 🟢     │ │
│  │  状态: 使用中 | 交易员: 交易员-01                 │ │
│  │  [查看] [编辑] [新建迭代] [删除 ❌禁用]           │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ 📄 GridBot (网格策略)                             │ │
│  │   └─ v1  [2026-05-01] ← 最新版本                 │ │
│  │  状态: 未使用                                     │ │
│  │  [查看] [编辑] [新建迭代] [删除]                   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  [+ 新建策略]                                          │
│                                                       │
│  ───────────────────────────────────────────────────── │
│  编辑策略: VegasMeanReversion                          │
│                                                       │
│  策略名称: [VegasMeanReversion            ]           │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ # AI自动交易员策略                                │ │
│  │ ## 1. 角色设定                                  │ │
│  │ 你是一名严格执行量化规则的交易执行代理...         │ │
│  │                                                  │ │
│  │ ## 2. 指标参数                                  │ │
│  │ RSI(14): 超卖≤30, 超买≥70                       │ │
│  │ 维加斯: EMA144 & EMA169                         │ │
│  │ ...                                              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  [保存为新版本] [另存为新策略]                         │
└──────────────────────────────────────────────────────┘
```

> 策略迭代规则：不改名字只改内容 → 自动 v1→v2→v3，保留所有历史版本
> 正在使用中的策略不可删除，防止线上交易意外中断

#### 页面 3：交易员管理

```
┌──────────────────────────────────────────────────────┐
│  ← 返回   交易员管理                                   │
│                                                       │
│  所有交易员:                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🤖 交易员-01              状态: 🟢 运行中        │ │
│  │   模型: MiniMax M2.5                              │ │
│  │   交易所: OKX-实盘                                │ │
│  │   策略: VegasMeanReversion v2                     │ │
│  │  [看板] [停止] [编辑] [删除]                      │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ 🤖 交易员-02              状态: ⏸ 已停止         │ │
│  │   模型: DeepSeek                                  │ │
│  │   交易所: OKX-模拟盘                              │ │
│  │   策略: GridBot v1                                │ │
│  │  [看板] [启动] [编辑] [删除]                      │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  [+ 创建交易员]                                       │
│                                                       │
│  ── 创建交易员 ──                                     │
│  名称:    [________________________]                   │
│  交易所:  [OKX-实盘-主账户 ▼]                         │
│  LLM:     [MiniMax M2.5 ▼]      [+ 切换备用LLM]      │
│  备用LLM: [DeepSeek ▼]                               │
│  策略:    [VegasMeanReversion ▼]  [v2]               │
│                                                       │
│  [保存] [保存并启动]                                   │
└──────────────────────────────────────────────────────┘
```

#### 页面 4：看板（核心页面）

```
┌──────────────────────────────────────────────────────────────────┐
│  ← 返回  [Logo]  [交易员-01  ▼]  [项目初始化]  [策略]  [交易员] │
│                                                                    │
│  🤖 交易员-01                                                      │
│  模型: MiniMax M2.5  |  交易所: OKX-实盘  |  策略: VegasMeanRev v2 │
│                                                                    │
│  ┌──────────┬─────────────────────────────────────────────────┐   │
│  │ 📊 战绩   │  📋 最近决策                                    │   │
│  │           │  ╔═══════════════════════════════════════╗      │   │
│  │ 胜率      │  ║ 14:30 [BTC] K线收盘触发检查          ║      │   │
│  │  68.7%   │  ║ RSI=28.3 ≤30 ✅                       ║      │   │
│  │           │  ║ 维加斯方向=向下 ✅                     ║      │   │
│  │ 总盈亏    │  ║ 4H低点连降 ✅                          ║      │   │
│  │ +2,450   │  ║ → 开多 Long_Rev 🟢                    ║      │   │
│  │  USDT    │  ╚═══════════════════════════════════════╝      │   │
│  │           │  ╔═══════════════════════════════════════╗      │   │
│  │ 手续费    │  ║ 13:15 [ETH] K线收盘触发检查          ║      │   │
│  │  -123    │  ║ RSI=55 未超卖 ❌                      ║      │   │
│  │           │  ║ → 无信号 ⏭ 跳过                      ║      │   │
│  │ 交易次数  │  ╚═══════════════════════════════════════╝      │   │
│  │  47次    │  [▼ 展开思维链]                              │   │
│  │           │  ┌──────────────────────────────────────┐      │   │
│  │ 正在监控  │  │ 🤔 盯盘代理: 开始检查BTC/USDT...      │      │   │
│  │  6个交易对 │  │ 🧮 Python引擎: 计算EMA144=68120...   │      │   │
│  │           │  │ ✅ 条件全部满足: 通知主代理            │      │   │
│  │  仓位: 1  │  │ 👑 主代理: 决策 — 开多 Long_Rev       │      │   │
│  │           │  │ ⚡ 下单代理: 市价买入 BTC 100U        │      │   │
│  │           │  │ ✅ 成交 @67420, 止损 @66914 已挂      │      │   │
│  │           │  └──────────────────────────────────────┘      │   │
│  ├──────────┴─────────────────────────────────────────────────┤   │
│  │ 📂 历史仓位                                                │   │
│  │ ┌──────┬──────┬───────┬────────┬────────┬────────┬───────┐│   │
│  │ │交易对│方向  │开仓价  │平仓价   │盈亏     │手续费  │持仓时 ││   │
│  │ ├──────┼──────┼───────┼────────┼────────┼────────┼───────┤│   │
│  │ │BTC   │多头  │67420  │68900   │+1480   │ -12.5  │ 2h15m ││   │
│  │ │ETH   │空头  │3120   │3080    │+40     │ -3.2   │ 45m   ││   │
│  │ │SOL   │多头  │145    │142     │-30     │ -2.1   │ 1h30m ││   │
│  │ └──────┴──────┴───────┴────────┴────────┴────────┴───────┘│   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 五、核心组件详解

### 5.1 Web UI 层
- **前端：** React + TradingView Lightweight Charts（纯前端K线，不耗LLM token）
- **后端：** FastAPI (:8000)，提供 REST API + WebSocket
- **前端插件系统：** `plugin_registry.ts` 动态注册导航和页面组件
- **数据库：** PostgreSQL — 存储策略、持仓、订单日志、决策记录

### 5.2 AI 层 — Hermes Agent
- **主代理：** 读取用户写的 Markdown 策略 Prompt，拆解任务，调度子代理
- **盯盘代理：** 监控 N 个交易对（永续合约为主），每根 K 线收盘检查条件
- **下单代理：** 执行交易指令，挂止盈止损
- **风控代理：** 监控风险指标，紧急平仓/减仓
- **LLM 配置：** MiniMax M2.5（主力），子代理可配 DeepSeek 备用切换

### 5.3 交易所集成层 — OKX
- **MCP 方式：** `okx-trade-mcp` 通过 stdio 暴露工具，Hermes 原生消费
- **CLI 方式：** `okx-trade-cli` 用于获取K线数据
- **多账户：** 支持多个 OKX 账户（模拟盘 + 实盘）
- **OKX API 需填三项：** API Key, Secret Key, Passphrase

---

## 六、AI 决策流程

每根 K 线收盘触发：

```
① 盯盘代理: 获取170根K线 (okx CLI)
② 计算 EMA144/169, RSI(14), ATR(14)  (Python精确计算)
③ 逐条件检查策略 (Python)
   ├─ RSI ≤ 30?
   ├─ 维加斯通道方向?
   ├─ 4H连续低点下移?
   └─ 价格回踩EMA169?
④ 有信号? → 通知主代理
⑤ 主代理 → 下单代理: 市价/条件单开仓
⑥ 下单代理: 挂止损委托单 (可设置比例)
⑦ 写入DB + WebSocket推送到看板
⑧ 风控代理: 持续监控持仓
```

---

## 七、数据库表结构

| 表 | 说明 | 关键字段 |
|----|------|---------|
| **llm_config** | LLM 配置 | id, provider, api_key, model, base_url, is_active |
| **exchange_accounts** | 交易所账户 | id, name, type(demo/live), api_key, secret_key, passphrase, site |
| **strategies** | 策略 | id, name, current_version, status |
| **strategy_versions** | 策略版本 | id, strategy_id, version(v1/v2...), content(markdown), created_at |
| **traders** | 交易员 | id, name, llm_config_id, exchange_account_id, strategy_version_id, status |
| **decisions** | 决策日志 | id, trader_id, symbol, signal, decision_chain(json), created_at |
| **positions** | 仓位记录 | id, trader_id, symbol, side, open_price, close_price, pnl, fee, times |
| **monitored_symbols** | 监控交易对 | id, trader_id, symbol, status, added_at |
| **plugins** | 插件注册表 | id, name, version, enabled, config(json) |

---

## 八、部署方式

- Docker Compose 一键部署
- 包含：FastAPI + React、PostgreSQL、Hermes Agent（含 MCP Server）
- 服务器：64.83.39.142 (密码验证)

---

## 九、插件开发指南（预留）

未来添加新功能的开发者只需：

```python
# 1. 在 plugins/ 下创建新目录
# 2. 继承 BasePlugin
from core.plugin_loader import BasePlugin

class BacktestingPlugin(BasePlugin):
    def get_info(self):
        return {
            "name": "策略回测",
            "version": "1.0.0",
            "description": "用历史数据回测策略表现"
        }
    
    def register_routes(self, router):
        # 自动注册到 /api/backtesting/*
        router.get("/history")(self.get_history_data)
        router.post("/run")(self.run_backtest)
    
    def on_startup(self, app):
        # 自动创建 backtest_results 表
        pass

# 3. 前端创建对应的导航和页面组件
# 4. 重启即可 — 系统自动发现并注册新插件
```

Docker Compose 的设计也会预留 volumes 映射，让新插件的添加不需要修改核心代码：
```yaml
volumes:
  - ./plugins:/app/plugins     # 插件目录 — 加新文件即可
  - ./frontend/src/plugins:/app/frontend/src/plugins  # 前端插件
```
