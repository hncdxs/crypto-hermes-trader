"""交易员管理 API

交易员 CRUD + 启停：
- GET  /traders        列表（关联 strategy name）
- POST /traders        新建
- PUT  /traders/{id}   编辑
- DELETE /traders/{id} 删除
- POST /traders/{id}/start  启动
- POST /traders/{id}/stop   停止
"""

import json
from datetime import datetime
from uuid import uuid4

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Row

from core.database import get_db
from core.hermes_runner import run_hermes_chat, get_hermes_status, find_hermes

logger = logging.getLogger("traders_router")

router = APIRouter()

# ──────────── Schemas ────────────


class TraderCreate(BaseModel):
    name: str
    strategy_id: str
    main_period: str = "5m"
    ref_period: str = "1h"
    scan_interval: str = "5m"
    trade_type: str = "spot"
    symbols: list[str] = Field(default_factory=list)
    llm_config_id: str | None = None
    exchange_account_id: str | None = None
    executor_temp: float = 0.3
    risk_temp: float = 0.3


class TraderUpdate(BaseModel):
    name: str | None = None
    strategy_id: str | None = None
    main_period: str | None = None
    ref_period: str | None = None
    scan_interval: str | None = None
    trade_type: str | None = None
    symbols: list[str] | None = None
    llm_config_id: str | None = None
    exchange_account_id: str | None = None
    executor_temp: float | None = None
    risk_temp: float | None = None


class TraderOut(BaseModel):
    id: str
    name: str
    strategy_id: str | None
    strategy_name: str | None = None
    main_period: str
    ref_period: str
    scan_interval: str
    trade_type: str
    symbols: list
    llm_config_id: str | None
    exchange_account_id: str | None
    executor_temp: float
    risk_temp: float
    status: str
    created_at: datetime
    updated_at: datetime


# ──────────── Helpers ────────────


async def _ensure_trader_exists(db: AsyncSession, trader_id: str) -> dict:
    """检查交易员是否存在并返回数据"""
    row = (
        await db.execute(
            text("SELECT * FROM traders WHERE id = :id"), {"id": trader_id}
        )
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="交易员不存在")
    return row._mapping


async def _ensure_strategy_exists(db: AsyncSession, strategy_id: str) -> dict:
    """检查策略是否存在"""
    row = (
        await db.execute(
            text("SELECT id, name FROM strategies WHERE id = :id"),
            {"id": strategy_id},
        )
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="策略不存在")
    return row._mapping


async def _create_default_agent_configs(
    db: AsyncSession, trader_id: str, executor_temp: float, risk_temp: float
) -> None:
    """为指定 trader 创建 4 条默认 agent_config"""
    agent_types = ["monitor", "master", "executor", "risk"]
    temperatures = {
        "monitor": 0.3,
        "master": 0.3,
        "executor": executor_temp,
        "risk": risk_temp,
    }
    now = datetime.now(timezone.utc)
    for agent_type in agent_types:
        await db.execute(
            text(
                """INSERT INTO agent_configs
                   (id, trader_id, agent_type, temperature, system_prompt, status, created_at)
                   VALUES (:id, :trader_id, :agent_type, :temperature, '', 'idle', :created_at)"""
            ),
            {
                "id": str(uuid4()),
                "trader_id": trader_id,
                "agent_type": agent_type,
                "temperature": temperatures[agent_type],
                "created_at": now,
            },
        )


def _row_to_trader_out(row, strategy_name: str | None = None) -> dict:
    """将数据库行转为 dict"""
    symbols = row.symbols if row.symbols else []
    if isinstance(symbols, str):
        try:
            symbols = json.loads(symbols)
        except (json.JSONDecodeError, TypeError):
            symbols = []

    return {
        "id": row.id,
        "name": row.name,
        "strategy_id": row.strategy_id,
        "strategy_name": strategy_name,
        "main_period": row.main_period,
        "ref_period": row.ref_period,
        "scan_interval": row.scan_interval,
        "trade_type": row.trade_type,
        "symbols": symbols,
        "llm_config_id": row.llm_config_id,
        "exchange_account_id": row.exchange_account_id,
        "executor_temp": float(row.executor_temp) if row.executor_temp is not None else 0.3,
        "risk_temp": float(row.risk_temp) if row.risk_temp is not None else 0.3,
        "status": row.status,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


# ──────────── Routes ────────────


@router.get("")
async def list_traders(
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """列出所有交易员（关联 strategy name）"""
    rows = (
        await db.execute(
            text(
                """SELECT t.*, s.name AS strategy_name
                   FROM traders t
                   LEFT JOIN strategies s ON t.strategy_id = s.id
                   ORDER BY t.updated_at DESC"""
            )
        )
    ).fetchall()

    result = []
    for r in rows:
        trader_dict = _row_to_trader_out(r, r.strategy_name)
        result.append(trader_dict)
    return result


@router.post("", status_code=201)
async def create_trader(
    data: TraderCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """新建交易员

    必填: name, strategy_id
    可选: main_period, ref_period, scan_interval, trade_type, symbols,
          llm_config_id, exchange_account_id, executor_temp, risk_temp

    创建时自动生成 4 条 agent_config（monitor, master, executor, risk）
    """
    # 检查策略是否存在
    await _ensure_strategy_exists(db, data.strategy_id)

    trader_id = str(uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(
        text(
            """INSERT INTO traders
               (id, name, strategy_id, main_period, ref_period, scan_interval,
                trade_type, symbols, llm_config_id, exchange_account_id,
                executor_temp, risk_temp, status, created_at, updated_at)
               VALUES
               (:id, :name, :strategy_id, :main_period, :ref_period, :scan_interval,
                :trade_type, :symbols::jsonb, :llm_config_id, :exchange_account_id,
                :executor_temp, :risk_temp, 'stopped', :created_at, :updated_at)"""
        ),
        {
            "id": trader_id,
            "name": data.name,
            "strategy_id": data.strategy_id,
            "main_period": data.main_period,
            "ref_period": data.ref_period,
            "scan_interval": data.scan_interval,
            "trade_type": data.trade_type,
            "symbols": json.dumps(data.symbols),
            "llm_config_id": data.llm_config_id,
            "exchange_account_id": data.exchange_account_id,
            "executor_temp": data.executor_temp,
            "risk_temp": data.risk_temp,
            "created_at": now,
            "updated_at": now,
        },
    )

    # 创建默认 agent_configs
    await _create_default_agent_configs(
        db, trader_id, data.executor_temp, data.risk_temp
    )

    return {
        "id": trader_id,
        "name": data.name,
        "strategy_id": data.strategy_id,
        "status": "stopped",
    }


@router.put("/{trader_id}")
async def update_trader(
    trader_id: str,
    data: TraderUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """编辑交易员"""
    trader = await _ensure_trader_exists(db, trader_id)
    now = datetime.now(timezone.utc)

    # 如果 strategy_id 改变，检查新策略是否存在
    new_strategy_id = data.strategy_id if data.strategy_id is not None else trader["strategy_id"]
    if data.strategy_id is not None and data.strategy_id != trader["strategy_id"]:
        await _ensure_strategy_exists(db, data.strategy_id)

    # 构建动态 UPDATE
    fields = {
        "name": data.name,
        "strategy_id": new_strategy_id,
        "main_period": data.main_period,
        "ref_period": data.ref_period,
        "scan_interval": data.scan_interval,
        "trade_type": data.trade_type,
        "symbols": json.dumps(data.symbols) if data.symbols is not None else None,
        "llm_config_id": data.llm_config_id,
        "exchange_account_id": data.exchange_account_id,
        "executor_temp": data.executor_temp,
        "risk_temp": data.risk_temp,
    }

    # 只更新非 None 字段
    set_parts = []
    params = {"id": trader_id, "updated_at": now}
    for col, val in fields.items():
        if val is not None:
            if col == "symbols":
                set_parts.append(f"{col} = :{col}::jsonb")
            else:
                set_parts.append(f"{col} = :{col}")
            params[col] = val

    if not set_parts:
        return {"id": trader_id, "status": "no_change"}

    set_parts.append("updated_at = :updated_at")
    sql = f"UPDATE traders SET {', '.join(set_parts)} WHERE id = :id"

    await db.execute(text(sql), params)

    return {"id": trader_id, "status": "updated"}


@router.delete("/{trader_id}")
async def delete_trader(
    trader_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """删除交易员（级联删除关联的 agent_configs、decisions、positions）"""
    await _ensure_trader_exists(db, trader_id)

    # agent_configs 和 decisions/positions 有 ON DELETE CASCADE，只需删除 trader
    await db.execute(
        text("DELETE FROM traders WHERE id = :id"), {"id": trader_id}
    )

    return {"status": "deleted", "id": trader_id}


@router.post("/{trader_id}/start")
async def start_trader(
    trader_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """启动交易员 — 通过 Hermes Agent 执行策略

    核心逻辑：
      1. 读取交易员关联的策略 prompt
      2. 读取交易所、LLM 配置
      3. 构造完整策略 prompt 发送给 hermes chat
      4. Hermes 调工具拉行情 → 调 LLM 分析 → 做决策 → 写数据库
      5. 将 Hermes 的输出存入 thinking_logs 表
      6. 通过 WebSocket 推送实时思维链到前端看板
    """
    trader = await _ensure_trader_exists(db, trader_id)

    if trader["status"] == "running":
        return {"id": trader_id, "status": "running", "message": "交易员已在运行中"}

    # 1. 读取策略 prompt
    strategy_id = trader["strategy_id"]
    if not strategy_id:
        raise HTTPException(status_code=400, detail="交易员未关联策略")

    strategy = (await db.execute(
        text("SELECT name, description, indicators FROM strategies WHERE id = :id"),
        {"id": strategy_id},
    )).fetchone()

    if not strategy:
        raise HTTPException(status_code=404, detail="关联策略不存在")

    # 2. 读取交易所配置
    exchange_info = ""
    exchange_account_id = trader["exchange_account_id"]
    if exchange_account_id:
        ex = (await db.execute(
            text("SELECT name, type FROM exchange_accounts WHERE id = :id"),
            {"id": exchange_account_id},
        )).fetchone()
        if ex:
            exchange_info = f"交易所: {ex.name} ({ex.type})"

    # 3. 读取 LLM 配置
    llm_info = ""
    llm_config_id = trader["llm_config_id"]
    if llm_config_id:
        llm = (await db.execute(
            text("SELECT provider, model FROM llm_config WHERE id = :id"),
            {"id": llm_config_id},
        )).fetchone()
        if llm:
            llm_info = f"AI 模型: {llm.provider}/{llm.model}"

    # 4. 构造完整策略 prompt（附带行情数据）
    symbols = trader["symbols"]
    if isinstance(symbols, str):
        try:
            symbols = json.loads(symbols)
        except (json.JSONDecodeError, TypeError):
            symbols = []

    indicators = strategy.indicators
    if isinstance(indicators, str):
        try:
            indicators = json.loads(indicators)
        except (json.JSONDecodeError, TypeError):
            indicators = []

    # 预先获取行情数据（ccxt 直连，不通过 Hermes）
    market_data_str = "（行情数据获取失败）"
    try:
        import ccxt.async_support as ccxt_async

        if exchange_account_id:
            ex_row = (await db.execute(
                text("SELECT api_key, secret_key, passphrase FROM exchange_accounts WHERE id = :id"),
                {"id": exchange_account_id},
            )).fetchone()
            if ex_row and symbols:
                okx = ccxt_async.okx({
                    "apiKey": ex_row.api_key,
                    "secret": ex_row.secret_key,
                    "password": ex_row.passphrase,
                })
                okx.set_sandbox_mode(True)
                symbol_ccxt = symbols[0].replace("-", "/")
                ohlcv = await okx.fetch_ohlcv(symbol_ccxt, timeframe=trader["main_period"], limit=50)
                ticker = await okx.fetch_ticker(symbol_ccxt)
                await okx.close()

                if ohlcv:
                    closes = [c[4] for c in ohlcv]
                    ema12 = sum(closes[-12:]) / min(12, len(closes)) if len(closes) >= 12 else 0
                    ema26 = sum(closes[-26:]) / min(26, len(closes)) if len(closes) >= 26 else 0
                    rsi_period = 14
                    if len(closes) > rsi_period:
                        gains, losses = 0, 0
                        for i in range(-rsi_period, 0):
                            diff = closes[i] - closes[i - 1]
                            if diff > 0:
                                gains += diff
                            else:
                                losses -= diff
                        avg_gain = gains / rsi_period
                        avg_loss = losses / rsi_period
                        rsi = 100 - (100 / (1 + avg_gain / avg_loss)) if avg_loss > 0 else 100
                    else:
                        rsi = 50

                    market_data_str = (
                        f"最新价格: ${ticker['last']:.2f}\n"
                        f"24h最高: ${ticker['high']:.2f}\n"
                        f"24h最低: ${ticker['low']:.2f}\n"
                        f"24h成交量: {ticker['baseVolume']:.4f}\n"
                        f"EMA12: {ema12:.2f}\n"
                        f"EMA26: {ema26:.2f}\n"
                        f"RSI14: {rsi:.2f}\n"
                        f"K线数量: {len(ohlcv)} 根 ({trader['main_period']})"
                    )
    except Exception as e:
        market_data_str = f"（行情获取失败: {e}）"

    full_prompt = f"""你是一个专业的加密货币交易分析师。
请根据以下信息做出交易决策。

【交易员信息】
名称: {trader["name"]}
交易对: {', '.join(symbols) if symbols else '未设置'}
主周期: {trader["main_period"]}
参考周期: {trader["ref_period"]}
交易类型: {trader["trade_type"]}
{exchange_info}
{llm_info}

【策略信息】
名称: {strategy.name}
指标配置: {json.dumps(indicators, ensure_ascii=False)}
策略描述: {strategy.description}

【实时行情数据】
{market_data_str}

【你的任务】
分析上述行情数据和策略条件，给出交易决策。

请直接输出以下格式的 JSON 结果（不要包含其他内容）:
{{
  "signal": "long/short/hold",
  "confidence": 85,
  "reason": "你的分析理由（50字以内）"
}}"""

    # 5. 更新状态为 running
    now = datetime.utcnow()
    await db.execute(
        text("UPDATE traders SET status = 'running', updated_at = :updated_at WHERE id = :id"),
        {"id": trader_id, "updated_at": now},
    )
    await db.commit()

    # 6. 执行 Hermes chat（后台线程，不阻塞 API 响应）
    # 把所有数据序列化传给线程，避免闭包问题
    import json as _json
    import threading as _threading

    # 序列化准备
    _trader_id = trader_id
    _exchange_acc_id = exchange_account_id
    _symbols = symbols
    _trader_name = trader["name"]
    _main_period = trader["main_period"]
    _ref_period = trader["ref_period"]
    _trade_type = trader["trade_type"]
    _exchange_info = exchange_info
    _llm_info = llm_info
    _strategy_name = strategy.name
    _indicators = indicators
    _strategy_desc = strategy.description
    _market_data_str = market_data_str

    def _run_sync():
        """在线程中同步运行 Hermes chat"""
        import asyncio as _asyncio
        import os as _os
        from core.hermes_runner import run_hermes_chat, find_hermes, get_env

        # 重新构建 prompt（在线程内，避免闭包变量作用域问题）
        prompt = f"""你是一个专业的加密货币交易分析师。
请根据以下信息做出交易决策。

【交易员信息】
名称: {_trader_name}
交易对: {', '.join(_symbols) if _symbols else '未设置'}
主周期: {_main_period}
参考周期: {_ref_period}
交易类型: {_trade_type}
{_exchange_info}
{_llm_info}

【策略信息】
名称: {_strategy_name}
指标配置: {_json.dumps(_indicators, ensure_ascii=False)}
策略描述: {_strategy_desc}

【实时行情数据】
{_market_data_str}

【你的任务】
分析上述行情数据和策略条件，给出交易决策。

请直接输出以下格式的 JSON 结果（不要包含其他内容）:
{{"signal": "long/short/hold", "confidence": 85, "reason": "你的分析理由（50字以内）"}}"""

        _loop = _asyncio.new_event_loop()
        _asyncio.set_event_loop(_loop)
        try:
            result = _loop.run_until_complete(
                run_hermes_chat(prompt, trader_id=_trader_id, timeout=180)
            )
            if result["success"] and result.get("output"):
                from core.database import async_session_factory
                async def _save():
                    async with async_session_factory() as ndb:
                        await _parse_and_save_decision(ndb, _trader_id, result["output"])
                _loop2 = _asyncio.new_event_loop()
                _loop2.run_until_complete(_save())
                _loop2.close()
        finally:
            _loop.close()

    thread = _threading.Thread(target=_run_sync, daemon=True)
    thread.start()
    logger.info(f"Hermes 线程已启动 (trader={_trader_id})")

    return {
        "id": trader_id,
        "status": "running",
        "message": "交易员已启动，策略已发送给 Hermes 执行",
    }


@router.post("/{trader_id}/stop")
async def stop_trader(
    trader_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """停止交易员（更新状态为 stopped）

    后续可扩展：同时取消 Hermes cronjob
    """
    trader = await _ensure_trader_exists(db, trader_id)

    if trader["status"] == "stopped":
        return {"id": trader_id, "status": "stopped", "message": "交易员已停止"}

    now = datetime.utcnow()
    await db.execute(
        text("UPDATE traders SET status = 'stopped', updated_at = :updated_at WHERE id = :id"),
        {"id": trader_id, "updated_at": now},
    )
    await db.commit()

    return {"id": trader_id, "status": "stopped"}


async def _parse_and_save_decision(db: AsyncSession, trader_id: str, hermes_output: str):
    """从 Hermes 输出中解析决策信号并写入 decisions 表"""
    import re
    from uuid import uuid4

    try:
        # 获取 trader 信息
        trader = (await db.execute(
            text("SELECT strategy_id, symbols FROM traders WHERE id = :id"),
            {"id": trader_id},
        )).fetchone()
        if not trader:
            return

        strategy_id = trader.strategy_id
        symbols = trader.symbols
        if isinstance(symbols, str):
            try:
                symbols = json.loads(symbols)
            except Exception:
                symbols = []
        symbol = symbols[0] if symbols else "BTC-USDT"

        # 从输出中提取信号：先尝试 JSON 解析
        signal = "hold"
        confidence = 0
        reasoning = hermes_output

        # 尝试提取 JSON 块
        import re as _re
        json_match = _re.search(r'\{(?:[^{}]|(?:\{[^{}]*\}))*"signal"(?:[^{}]|(?:\{[^{}]*\}))*\}', hermes_output, _re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                raw_signal = parsed.get("signal", "hold").lower()
                signal_map = {"long": "long", "buy": "long", "short": "short", "sell": "short", "close": "close", "hold": "hold"}
                signal = signal_map.get(raw_signal, "hold")
                confidence = min(float(parsed.get("confidence", 0)), 100)
                reasoning = parsed.get("reason", hermes_output[:200])
            except Exception:
                pass

        # 匹配 SIGNAL 行
        m = re.search(r'SIGNAL[:\s]+(long|short|hold|buy|sell|close)', hermes_output, re.IGNORECASE)
        if m:
            raw = m.group(1).lower()
            signal_map = {"long": "long", "buy": "long", "short": "short", "sell": "short", "close": "close", "hold": "hold"}
            signal = signal_map.get(raw, "hold")

        # 匹配置信度
        m2 = re.search(r'confidence[:\s]+([0-9.]+)', hermes_output, re.IGNORECASE)
        if m2:
            confidence = min(float(m2.group(1)), 100)

        # 匹配价格
        price = None
        m3 = re.search(r'price[:\s]*\$?([0-9,.]+)', hermes_output, re.IGNORECASE)
        if m3:
            try:
                price = float(m3.group(1).replace(",", ""))
            except Exception:
                pass

        now = datetime.utcnow()
        await db.execute(
            text("""
                INSERT INTO decisions (id, trader_id, strategy_id, symbol, signal, confidence,
                    master_chain, decision_chain, created_at)
                VALUES (:id, :trader_id, :strategy_id, :symbol, :signal, :confidence,
                    :master_chain, :decision_chain, :created_at)
            """),
            {
                "id": str(uuid4()),
                "trader_id": trader_id,
                "strategy_id": strategy_id,
                "symbol": symbol,
                "signal": signal,
                "confidence": confidence,
                "master_chain": hermes_output[:5000],
                "decision_chain": json.dumps({
                    "output_snippet": hermes_output[:1000],
                    "price": price,
                }),
                "created_at": now,
            }
        )
        # Also create a session for save
        await db.commit()
        logger.info(f"决策已保存: {symbol} {signal} ({confidence}%)")
    except Exception as e:
        logger.warning(f"解析 Hermes 输出保存决策失败: {e}")
