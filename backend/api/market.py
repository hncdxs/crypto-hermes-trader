"""行情 K 线 API

等待后续对接 OKX MCP，当前返回模拟数据。
- GET /market/kline — K 线数据

TODO: 对接 OKX MCP 后替换 mock 数据
"""

import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Query

router = APIRouter()


def _generate_mock_kline(
    symbol: str,
    bar: str,
    limit: int,
) -> list[dict]:
    """生成模拟 K 线数据"""
    now = datetime.utcnow()
    interval_map = {
        "1m": timedelta(minutes=1),
        "5m": timedelta(minutes=5),
        "15m": timedelta(minutes=15),
        "30m": timedelta(minutes=30),
        "1H": timedelta(hours=1),
        "4H": timedelta(hours=4),
        "1D": timedelta(days=1),
    }
    step = interval_map.get(bar, timedelta(minutes=5))

    price = random.uniform(60000, 70000) if "BTC" in symbol else random.uniform(2000, 3000)
    candles = []
    for i in range(limit - 1, -1, -1):
        ts = int((now - step * i).timestamp() * 1000)
        change = random.uniform(-0.02, 0.02) * price
        o = round(price, 2)
        h = round(max(o, o + change) * (1 + random.uniform(0, 0.005)), 2)
        l = round(min(o, o + change) * (1 - random.uniform(0, 0.005)), 2)
        c = round(o + change, 2)
        vol = round(random.uniform(10, 200), 4)
        price = o + change * random.uniform(-0.5, 0.5)

        candles.append(
            {
                "ts": ts,
                "open": str(o),
                "high": str(h),
                "low": str(l),
                "close": str(c),
                "vol": str(vol),
                "confirm": "1",
            }
        )
    return candles


@router.get("/kline")
async def get_kline(
    symbol: str = Query("BTC-USDT", description="交易对"),
    bar: str = Query("5m", description="K 线周期: 1m,5m,15m,30m,1H,4H,1D"),
    limit: int = Query(100, ge=1, le=500, description="返回条数"),
):
    """获取 K 线数据

    等待对接 OKX MCP 后替换为实时行情数据。
    当前返回模拟数据仅供前端开发和测试使用。
    """
    candles = _generate_mock_kline(symbol, bar, limit)
    return {
        "symbol": symbol,
        "bar": bar,
        "limit": limit,
        "candles": candles,
    }
