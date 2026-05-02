"""应用入口"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.plugin_loader import PluginLoader
from core.websocket_manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时：加载插件
    loader = PluginLoader(str(settings.PLUGINS_DIR))
    app.state.plugin_loader = loader
    app.state.ws_manager = ws_manager
    yield
    # 关闭时：清理
    # TODO: 调用所有插件的 on_shutdown


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

    # 注册核心路由
    from api.init import router as init_router
    from api.strategies import router as strategies_router
    from api.traders import router as traders_router
    from api.dashboard import router as dashboard_router
    from api.balance import router as balance_router
    from api.market import router as market_router
    from api.plugins import router as plugins_router

    app.include_router(init_router, prefix="/api/init", tags=["初始化"])
    app.include_router(strategies_router, prefix="/api/strategies", tags=["策略"])
    app.include_router(traders_router, prefix="/api/traders", tags=["交易员"])
    app.include_router(dashboard_router, prefix="/api/dashboard", tags=["看板"])
    app.include_router(balance_router, prefix="/api/balance", tags=["余额"])
    app.include_router(market_router, prefix="/api/market", tags=["行情"])
    app.include_router(plugins_router, prefix="/api/plugins", tags=["插件"])

    return app


app = create_app()
