"""看板 API"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.websocket_manager import ws_manager

router = APIRouter()


@router.get("/{trader_id}")
async def get_dashboard(trader_id: str):
    """获取看板数据：胜率、盈亏、最近决策、历史仓位"""
    return {
        "trader": {
            "name": "",
            "model": "",
            "exchange": "",
            "strategy": "",
        },
        "stats": {
            "win_rate": 0,
            "total_pnl": 0,
            "total_fee": 0,
            "trade_count": 0,
            "monitored_symbols": [],
            "open_positions": 0,
        },
        "recent_decisions": [],
        "position_history": [],
    }


@router.websocket("/ws/{trader_id}")
async def dashboard_websocket(trader_id: str, ws: WebSocket):
    """WebSocket 实时推送看板数据"""
    channel = f"dashboard:{trader_id}"
    await ws_manager.connect(channel, ws)
    try:
        while True:
            await ws.receive_text()  # keep alive
    except WebSocketDisconnect:
        ws_manager.disconnect(channel, ws)
