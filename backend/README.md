# Crypto AI Trader Backend

FastAPI 后端，提供 REST API 和 WebSocket。

## 目录结构

```
backend/
├── api/          # API 路由
│   ├── __init__.py
│   ├── init.py       # 项目初始化
│   ├── strategies.py # 策略管理
│   ├── traders.py    # 交易员管理
│   ├── dashboard.py  # 看板
│   └── plugins.py    # 插件管理
├── core/         # 核心框架
│   ├── __init__.py
│   ├── database.py         # 数据库连接
│   ├── plugin_loader.py    # 插件加载器
│   ├── websocket_manager.py# WebSocket 管理器
│   └── config_manager.py   # 配置管理
├── services/     # 业务服务
│   ├── __init__.py
│   ├── okx_service.py      # OKX 交易服务
│   └── hermes_service.py   # Hermes Agent 管理
├── db/           # 数据库
│   └── init.sql            # 初始化 SQL
├── main.py       # 入口
├── Dockerfile
└── requirements.txt
```
