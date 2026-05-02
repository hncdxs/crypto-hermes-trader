"""策略管理 API

策略 CRUD：
- GET  /strategies       列表
- POST /strategies       新建（自动生成 v1 + 关联 trader 的 agent_configs）
- GET  /strategies/{id}  详情（含所有版本）
- PUT  /strategies/{id}  编辑（自动生成新版本 v2, v3...）
- POST /strategies/{id}/clone  另存副本
- DELETE /strategies/{id} 删除（使用中禁止删除）
"""

import json
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db

router = APIRouter()

# ──────────── Schemas ────────────


class IndicatorParam(BaseModel):
    name: str
    params: dict = Field(default_factory=dict)


class StrategyCreate(BaseModel):
    name: str
    indicators: list[IndicatorParam] = Field(default_factory=list)
    description: str = ""


class StrategyUpdate(BaseModel):
    name: str | None = None
    indicators: list[IndicatorParam] | None = None
    description: str | None = None


class StrategyClone(BaseModel):
    new_name: str


class StrategyOut(BaseModel):
    id: str
    name: str
    indicators: list
    description: str
    status: str
    current_version: str
    created_at: datetime
    updated_at: datetime


class StrategyVersionOut(BaseModel):
    id: str
    version: str
    content: str | dict
    created_at: datetime


# ──────────── Helpers ────────────


def _build_content_snapshot(
    name: str, indicators: list, description: str
) -> str:
    """构建策略快照 JSON 字符串"""
    return json.dumps(
        {
            "name": name,
            "indicators": [m.model_dump() for m in indicators]
            if indicators and isinstance(indicators[0], BaseModel)
            else indicators,
            "description": description,
        },
        ensure_ascii=False,
    )


async def _ensure_strategy_exists(db: AsyncSession, strategy_id: str) -> dict:
    """检查策略是否存在并返回数据"""
    row = (
        await db.execute(
            text("SELECT * FROM strategies WHERE id = :id"), {"id": strategy_id}
        )
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="策略不存在")
    return row._mapping


async def _parse_version(version_str: str) -> int:
    """将 'v1' 转为数字 1"""
    return int(version_str.lstrip("v"))


async def _next_version(current: str) -> str:
    """从当前版本生成下一个版本号，如 v1 -> v2"""
    n = await _parse_version(current)
    return f"v{n + 1}"


async def _insert_strategy_version(
    db: AsyncSession, strategy_id: str, version: str, content: str
) -> None:
    await db.execute(
        text(
            """INSERT INTO strategy_versions (id, strategy_id, version, content, created_at)
               VALUES (:id, :strategy_id, :version, :content, :created_at)"""
        ),
        {
            "id": str(uuid4()),
            "strategy_id": strategy_id,
            "version": version,
            "content": content,
            "created_at": datetime.now(timezone.utc),
        },
    )


async def _create_default_agent_configs(
    db: AsyncSession, trader_id: str, strategy_id: str
) -> None:
    """为指定 trader 创建 4 条默认 agent_config（monitor, master, executor, risk）"""
    agent_types = ["monitor", "master", "executor", "risk"]
    for agent_type in agent_types:
        temp = 0.3  # executor 和 risk 默认 0.3，monitor/master 也使用同样默认
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
                "temperature": temp,
                "created_at": datetime.now(timezone.utc),
            },
        )


async def _get_associated_traders(
    db: AsyncSession, strategy_id: str
) -> list[dict]:
    """获取使用该策略的所有交易员"""
    rows = (
        await db.execute(
            text("SELECT id, name FROM traders WHERE strategy_id = :sid"),
            {"sid": strategy_id},
        )
    ).fetchall()
    return [{"id": r.id, "name": r.name} for r in rows]


# ──────────── Routes ────────────


@router.get("")
async def list_strategies(
    db: AsyncSession = Depends(get_db),
) -> list[StrategyOut]:
    """列出所有策略"""
    rows = (
        await db.execute(
            text(
                """SELECT id, name, indicators, description, status,
                          current_version, created_at, updated_at
                   FROM strategies
                   ORDER BY updated_at DESC"""
            )
        )
    ).fetchall()
    return [
        StrategyOut(
            id=r.id,
            name=r.name,
            indicators=r.indicators if r.indicators else [],
            description=r.description or "",
            status=r.status,
            current_version=r.current_version,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.post("", status_code=201)
async def create_strategy(
    data: StrategyCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """新建策略

    创建策略记录，同时：
    1. 生成 strategy_versions v1
    2. 为每个关联该策略的 trader 自动创建 4 条 agent_config
    """
    strategy_id = str(uuid4())
    now = datetime.now(timezone.utc)
    content = _build_content_snapshot(data.name, data.indicators, data.description)

    # 1. 插入策略
    await db.execute(
        text(
            """INSERT INTO strategies (id, name, indicators, description, status, current_version, created_at, updated_at)
               VALUES (:id, :name, :indicators, :description, 'active', 'v1', :created_at, :updated_at)"""
        ),
        {
            "id": strategy_id,
            "name": data.name,
            "indicators": json.dumps([i.model_dump() for i in data.indicators]),
            "description": data.description,
            "created_at": now,
            "updated_at": now,
        },
    )

    # 2. 插入 v1 版本快照
    await _insert_strategy_version(db, strategy_id, "v1", content)

    return {"id": strategy_id, "name": data.name, "current_version": "v1"}


@router.get("/{strategy_id}")
async def get_strategy(
    strategy_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """获取策略详情（含所有版本和使用中的交易员）"""
    strategy = await _ensure_strategy_exists(db, strategy_id)
    s = strategy

    # 获取所有版本
    versions_rows = (
        await db.execute(
            text(
                """SELECT id, version, content, created_at
                   FROM strategy_versions
                   WHERE strategy_id = :sid
                   ORDER BY created_at DESC"""
            ),
            {"sid": strategy_id},
        )
    ).fetchall()

    versions = []
    for v in versions_rows:
        content = v.content
        try:
            content = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            pass
        versions.append(
            {
                "id": v.id,
                "version": v.version,
                "content": content,
                "created_at": v.created_at,
            }
        )

    # 获取关联交易员
    traders = await _get_associated_traders(db, strategy_id)

    indicators = s.indicators if s.indicators else []
    try:
        if isinstance(indicators, str):
            indicators = json.loads(indicators)
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        "id": s.id,
        "name": s.name,
        "indicators": indicators,
        "description": s.description or "",
        "status": s.status,
        "current_version": s.current_version,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
        "versions": versions,
        "traders": traders,
    }


@router.put("/{strategy_id}")
async def update_strategy(
    strategy_id: str,
    data: StrategyUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """编辑策略，自动生成新版本（v2, v3...）"""
    strategy = await _ensure_strategy_exists(db, strategy_id)

    now = datetime.now(timezone.utc)
    new_version = await _next_version(strategy.current_version)

    # 构建更新后的字段
    new_name = data.name if data.name is not None else strategy.name
    new_indicators = (
        json.dumps([i.model_dump() for i in data.indicators])
        if data.indicators is not None
        else json.dumps(strategy.indicators) if strategy.indicators else "[]"
    )
    new_description = (
        data.description
        if data.description is not None
        else (strategy.description or "")
    )

    # 如果 indicators 是 JSON 数组（PostgreSQL 返回的），需要序列化
    if isinstance(strategy.indicators, (list, dict)):
        indicator_list = (
            data.indicators
            if data.indicators is not None
            else strategy.indicators
        )
    else:
        indicator_list = data.indicators if data.indicators is not None else []

    # 修正 new_indicators 逻辑
    if data.indicators is not None:
        new_indicators = json.dumps([i.model_dump() for i in data.indicators])
    elif isinstance(strategy.indicators, str):
        new_indicators = strategy.indicators
    else:
        new_indicators = json.dumps(strategy.indicators if strategy.indicators else [])

    if isinstance(strategy.description, str):
        new_description = (
            data.description
            if data.description is not None
            else strategy.description
        )
    else:
        new_description = data.description if data.description is not None else ""

    # 1. 更新策略主表
    await db.execute(
        text(
            """UPDATE strategies
               SET name = :name,
                   indicators = :indicators::jsonb,
                   description = :description,
                   current_version = :version,
                   updated_at = :updated_at
               WHERE id = :id"""
        ),
        {
            "id": strategy_id,
            "name": new_name,
            "indicators": new_indicators,
            "description": new_description,
            "version": new_version,
            "updated_at": now,
        },
    )

    # 2. 插入新版本快照
    snapshot = _build_content_snapshot(new_name, indicator_list, new_description)
    await _insert_strategy_version(db, strategy_id, new_version, snapshot)

    return {
        "id": strategy_id,
        "name": new_name,
        "new_version": new_version,
    }


@router.post("/{strategy_id}/clone")
async def clone_strategy(
    strategy_id: str,
    data: StrategyClone,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """另存副本（新名称，版本从 v1 开始）"""
    strategy = await _ensure_strategy_exists(db, strategy_id)
    now = datetime.now(timezone.utc)

    new_id = str(uuid4())
    indicators = strategy.indicators if strategy.indicators else []
    if isinstance(indicators, str):
        try:
            indicators = json.loads(indicators)
        except (json.JSONDecodeError, TypeError):
            indicators = []

    description = strategy.description or ""
    if isinstance(description, str):
        pass
    elif isinstance(description, dict) and "description" in description:
        description = description["description"]
    else:
        description = str(description)

    # 1. 插入新策略
    await db.execute(
        text(
            """INSERT INTO strategies (id, name, indicators, description, status, current_version, created_at, updated_at)
               VALUES (:id, :name, :indicators::jsonb, :description, 'active', 'v1', :created_at, :updated_at)"""
        ),
        {
            "id": new_id,
            "name": data.new_name,
            "indicators": json.dumps(indicators),
            "description": description,
            "created_at": now,
            "updated_at": now,
        },
    )

    # 2. 插入 v1 快照
    content = _build_content_snapshot(data.new_name, indicators, description)
    await _insert_strategy_version(db, new_id, "v1", content)

    return {"id": new_id, "name": data.new_name, "current_version": "v1"}


@router.delete("/{strategy_id}")
async def delete_strategy(
    strategy_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """删除策略

    如果策略被交易员使用中，禁止删除。
    由于数据库 ON DELETE SET NULL，删除后关联 trader 的 strategy_id 会置空。
    """
    strategy = await _ensure_strategy_exists(db, strategy_id)

    # 检查是否有 running 中的交易员使用该策略
    running_traders = (
        await db.execute(
            text(
                """SELECT id, name FROM traders
                   WHERE strategy_id = :sid AND status = 'running'"""
            ),
            {"sid": strategy_id},
        )
    ).fetchall()

    if running_traders:
        names = [t.name for t in running_traders]
        raise HTTPException(
            status_code=400,
            detail=f"策略正在被交易员使用中（{', '.join(names)}），请先停止或更改其策略",
        )

    await db.execute(
        text("DELETE FROM strategies WHERE id = :id"), {"id": strategy_id}
    )

    return {"status": "deleted", "id": strategy_id}
