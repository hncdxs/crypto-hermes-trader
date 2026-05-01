"""插件管理 API"""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_plugins():
    """列出所有已安装的插件"""
    return {
        "plugins": [
            {
                "name": "exchange_okx",
                "version": "0.1.0",
                "description": "OKX 交易所集成",
                "enabled": True,
            },
            {
                "name": "trader_hermes",
                "version": "0.1.0",
                "description": "Hermes 交易员引擎",
                "enabled": True,
            },
            {
                "name": "backtesting",
                "version": "0.1.0",
                "description": "策略回测 (预留)",
                "enabled": False,
            },
            {
                "name": "strategy_generator",
                "version": "0.1.0",
                "description": "AI 策略生成 (预留)",
                "enabled": False,
            },
        ]
    }
