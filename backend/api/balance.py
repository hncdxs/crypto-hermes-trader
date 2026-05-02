"""账户余额 API

等待后续对接 OKX MCP，当前返回 mock 数据。
- GET /balance    — 账户总览（总资产、各币种余额）

TODO: 对接 OKX MCP 后替换 mock 数据
"""

from fastapi import APIRouter

router = APIRouter()

MOCK_BALANCE = {
    "total_usd_value": 125840.75,
    "total_btc_value": 1.82,
    "accounts": [
        {
            "exchange": "OKX",
            "type": "funding",
            "balances": [
                {"currency": "BTC", "balance": "0.52", "usd_value": 35984.00},
                {"currency": "ETH", "balance": "8.35", "usd_value": 18503.75},
                {"currency": "USDT", "balance": "28391.50", "usd_value": 28391.50},
                {"currency": "SOL", "balance": "120.00", "usd_value": 15960.00},
            ],
        },
        {
            "exchange": "OKX",
            "type": "trading",
            "balances": [
                {"currency": "BTC", "balance": "0.30", "usd_value": 20760.00},
                {"currency": "ETH", "balance": "2.50", "usd_value": 5537.50},
                {"currency": "USDT", "balance": "10704.00", "usd_value": 10704.00},
            ],
        },
    ],
}


@router.get("")
async def get_balance():
    """获取账户余额总览

    返回各交易所账户的资产分布以及总 USD/BTC 估值。
    数据来源：等待对接 OKX MCP 实时数据。
    """
    return MOCK_BALANCE
