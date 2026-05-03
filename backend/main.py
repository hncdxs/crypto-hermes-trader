"""应用入口 — Hermes Agent 驱动的加密交易系统

核心逻辑：
  - Hermes Agent 是唯一执行体
  - 后端负责：数据库 CRUD + Hermes 子进程管理 + WebSocket 推送
  - 不包含任何 Python 引擎
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.websocket_manager import ws_manager

logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("Crypto AI Trader (Hermes 驱动引擎) 启动中...")
    yield
    # 关闭时
    logger.info("应用关闭")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册所有路由
    from api.init import router as init_router
    from api.strategies import router as strategies_router
    from api.traders import router as traders_router
    from api.dashboard import router as dashboard_router
    from api.balance import router as balance_router
    from api.market import router as market_router
    from api.plugins import router as plugins_router
    from api.exchange import router as exchange_router
    from api.chat import router as chat_router

    app.include_router(init_router, prefix="/api/init", tags=["初始化"])
    app.include_router(strategies_router, prefix="/api/strategies", tags=["策略"])
    app.include_router(traders_router, prefix="/api/traders", tags=["交易员"])
    app.include_router(dashboard_router, prefix="/api/dashboard", tags=["看板"])
    app.include_router(balance_router, prefix="/api/balance", tags=["余额"])
    app.include_router(market_router, prefix="/api/market", tags=["行情"])
    app.include_router(plugins_router, prefix="/api/plugins", tags=["插件"])
    app.include_router(exchange_router, prefix="/api/exchange", tags=["交易所"])
    app.include_router(chat_router, prefix="/api", tags=["对话"])

    return app


app = create_app()
