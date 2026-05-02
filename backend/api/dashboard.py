"""看板 API

提供仪表盘所需的聚合数据和列表接口：
- GET /summary         概览：运行中交易员、策略数、最新决策数
- GET /decisions       按扫描周期分组返回决策列表，支持展开 master_chain
- GET /positions       当前持仓
- GET /traders         正在运行的交易员
"""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db

router = APIRouter()

# ──────────── GET /summary ────────────


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
):
    """概览：运行中的交易员数、策略数、最新决策数"""

    # 运行中的交易员数
    running_traders = (
        await db.execute(
            text("SELECT COUNT(*) AS cnt FROM traders WHERE status = 'running'")
        )
    ).scalar()

    # 策略总数
    strategies = (
        await db.execute(text("SELECT COUNT(*) AS cnt FROM strategies"))
    ).scalar()

    # 最近 24 小时决策数
    last_24h = (
        await db.execute(
            text(
                "SELECT COUNT(*) AS cnt FROM decisions "
                "WHERE created_at >= NOW() - INTERVAL '24 hours'"
            )
        )
    ).scalar()

    return {
        "running_traders": running_traders or 0,
        "strategies": strategies or 0,
        "decisions_24h": last_24h or 0,
    }


# ──────────── GET /decisions ────────────


@router.get("/decisions")
async def get_decisions(
    period: str | None = Query(None, description="按扫描周期筛选，如 5m, 15m, 1h"),
    limit: int = Query(50, ge=1, le=200, description="返回条数"),
    db: AsyncSession = Depends(get_db),
):
    """决策列表

    按 created_at DESC 排序。扫描周期筛选可选。
    每条决策包含 trader_name, strategy_name, master_chain 完整思维链。
    """

    where = ""
    params: dict = {}

    if period:
        where = "WHERE d.scan_interval = :period"
        params["period"] = period

    sql = text(
        f"""SELECT d.id,
                   d.trader_id,
                   t.name AS trader_name,
                   d.strategy_id,
                   s.name AS strategy_name,
                   d.symbol,
                   d.signal,
                   d.confidence,
                   d.scan_interval,
                   d.monitor_output,
                   d.master_reason,
                   d.master_chain,
                   d.decision_chain,
                   d.created_at
            FROM decisions d
            LEFT JOIN traders t ON d.trader_id = t.id
            LEFT JOIN strategies s ON d.strategy_id = s.id
            {where}
            ORDER BY d.created_at DESC
            LIMIT :limit"""
    )

    rows = (await db.execute(sql, {**params, "limit": limit})).fetchall()

    decisions = []
    for r in rows:
        decisions.append(
            {
                "id": r.id,
                "trader_id": r.trader_id,
                "trader_name": r.trader_name or "",
                "strategy_id": r.strategy_id,
                "strategy_name": r.strategy_name or "",
                "symbol": r.symbol,
                "signal": r.signal,
                "confidence": float(r.confidence) if r.confidence is not None else 0,
                "scan_interval": r.scan_interval or "",
                "monitor_output": r.monitor_output or "",
                "master_reason": r.master_reason or "",
                "master_chain": r.master_chain or "",
                "decision_chain": r.decision_chain if r.decision_chain else [],
                "created_at": r.created_at,
            }
        )

    return {"decisions": decisions}


# ──────────── GET /positions ────────────


@router.get("/positions")
async def get_positions(
    status: str | None = Query(None, description="筛选状态: open, closed"),
    trader_id: str | None = Query(None, description="按交易员筛选"),
    db: AsyncSession = Depends(get_db),
):
    """当前持仓列表

    支持按状态和交易员筛选。
    返回持仓详情，含 trader_name 和 strategy_name。
    """
    conditions = []
    params: dict = {}

    if status:
        conditions.append("p.status = :status")
        params["status"] = status
    if trader_id:
        conditions.append("p.trader_id = :trader_id")
        params["trader_id"] = trader_id

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    sql = text(
        f"""SELECT p.id,
                   p.trader_id,
                   t.name AS trader_name,
                   p.strategy_id,
                   s.name AS strategy_name,
                   p.symbol,
                   p.side,
                   p.open_price,
                   p.close_price,
                   p.quantity,
                   p.pnl,
                   p.fee,
                   p.open_time,
                   p.close_time,
                   p.status
            FROM positions p
            LEFT JOIN traders t ON p.trader_id = t.id
            LEFT JOIN strategies s ON p.strategy_id = s.id
            {where}
            ORDER BY p.open_time DESC"""
    )

    rows = (await db.execute(sql, params)).fetchall()

    positions = []
    for r in rows:
        positions.append(
            {
                "id": r.id,
                "trader_id": r.trader_id,
                "trader_name": r.trader_name or "",
                "strategy_id": r.strategy_id,
                "strategy_name": r.strategy_name or "",
                "symbol": r.symbol,
                "side": r.side,
                "open_price": float(r.open_price) if r.open_price is not None else None,
                "close_price": float(r.close_price) if r.close_price is not None else None,
                "quantity": float(r.quantity) if r.quantity is not None else None,
                "pnl": float(r.pnl) if r.pnl is not None else None,
                "fee": float(r.fee) if r.fee is not None else None,
                "open_time": r.open_time,
                "close_time": r.close_time,
                "status": r.status,
            }
        )

    return {"positions": positions}


# ──────────── GET /traders ────────────


@router.get("/traders")
async def get_running_traders(
    db: AsyncSession = Depends(get_db),
):
    """正在运行的交易员列表

    返回所有 status = 'running' 的交易员，带策略名称。
    """
    rows = (
        await db.execute(
            text(
                """SELECT t.id, t.name, t.strategy_id, s.name AS strategy_name,
                          t.status, t.symbols, t.scan_interval, t.created_at
                   FROM traders t
                   LEFT JOIN strategies s ON t.strategy_id = s.id
                   WHERE t.status = 'running'
                   ORDER BY t.updated_at DESC"""
            )
        )
    ).fetchall()

    traders = []
    for r in rows:
        symbols = r.symbols if r.symbols else []
        if isinstance(symbols, str):
            import json

            try:
                symbols = json.loads(symbols)
            except (json.JSONDecodeError, TypeError):
                symbols = []

        traders.append(
            {
                "id": r.id,
                "name": r.name,
                "strategy_id": r.strategy_id,
                "strategy_name": r.strategy_name or "",
                "status": r.status,
                "symbols": symbols,
                "scan_interval": r.scan_interval or "",
                "created_at": r.created_at,
            }
        )

    return {"traders": traders}


# ──────────── Legacy: 单个 trader 看板 ────────────


@router.get("/{trader_id}")
async def get_dashboard(trader_id: str):
    """获取单个交易员看板数据（旧版兼容）"""
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
