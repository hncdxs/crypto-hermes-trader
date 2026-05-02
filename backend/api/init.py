"""项目初始化 API — 数据库操作版"""

from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db

router = APIRouter()

# ── Pydantic 模型 ──


class LLMConfigData(BaseModel):
    provider: str
    api_key: str
    model: str
    base_url: str


class ExchangeAccountData(BaseModel):
    name: str
    type: str  # 'demo' | 'live'
    api_key: str
    secret_key: str
    passphrase: str
    site: str = "global"


class SetupRequest(BaseModel):
    llm_config: LLMConfigData
    exchange_account: ExchangeAccountData


# ── GET /api/init/status ──


@router.get("/status")
async def get_init_status(db: AsyncSession = Depends(get_db)):
    """查询数据库返回初始化状态"""
    # LLM 是否已配置（有 is_active=true 的记录）
    llm_result = await db.execute(
        text("SELECT COUNT(*) FROM llm_config WHERE is_active = TRUE")
    )
    llm_configured = llm_result.scalar() > 0

    # 交易所账户数量
    acct_result = await db.execute(
        text("SELECT COUNT(*) FROM exchange_accounts")
    )
    accounts_count = acct_result.scalar()

    return {
        "initialized": llm_configured and accounts_count > 0,
        "llm_configured": llm_configured,
        "okx_installed": True,  # 部署时已装好
        "accounts_count": accounts_count,
    }


# ── POST /api/init/setup ──


@router.post("/setup")
async def setup_init(data: SetupRequest, db: AsyncSession = Depends(get_db)):
    """一次性完成初始化：清空表后插入 LLM 配置和交易所账户"""
    now = text("NOW()")

    # 1. 清空 llm_config 表
    await db.execute(text("DELETE FROM llm_config"))

    # 2. 插入新的 LLM 配置，设 is_active=true
    llm_id = str(uuid4())
    await db.execute(
        text(
            """INSERT INTO llm_config (id, provider, api_key, model, base_url, is_active, created_at, updated_at)
               VALUES (:id, :provider, :api_key, :model, :base_url, TRUE, :now, :now)"""
        ),
        {
            "id": llm_id,
            "provider": data.llm_config.provider,
            "api_key": data.llm_config.api_key,
            "model": data.llm_config.model,
            "base_url": data.llm_config.base_url,
            "now": now,
        },
    )

    # 3. 清空 exchange_accounts 表
    await db.execute(text("DELETE FROM exchange_accounts"))

    # 4. 插入新的交易所账户，设 is_default=true
    acct_id = str(uuid4())
    await db.execute(
        text(
            """INSERT INTO exchange_accounts (id, name, type, api_key, secret_key, passphrase, site, is_default, created_at)
               VALUES (:id, :name, :type, :api_key, :secret_key, :passphrase, :site, TRUE, :now)"""
        ),
        {
            "id": acct_id,
            "name": data.exchange_account.name,
            "type": data.exchange_account.type,
            "api_key": data.exchange_account.api_key,
            "secret_key": data.exchange_account.secret_key,
            "passphrase": data.exchange_account.passphrase,
            "site": data.exchange_account.site,
            "now": now,
        },
    )

    return {"status": "success"}


# ── GET /api/init/llm ──


@router.get("/llm")
async def get_llm_configs(db: AsyncSession = Depends(get_db)):
    """返回 llm_config 中 is_active=true 的记录列表"""
    result = await db.execute(
        text(
            """SELECT id, provider, model, base_url, is_active, created_at, updated_at
               FROM llm_config
               WHERE is_active = TRUE
               ORDER BY created_at DESC"""
        )
    )
    rows = result.mappings().all()
    return {"configs": [dict(row) for row in rows]}


# ── GET /api/init/exchange ──


@router.get("/exchange")
async def get_exchange_accounts(db: AsyncSession = Depends(get_db)):
    """返回 exchange_accounts 表中的账户列表"""
    result = await db.execute(
        text(
            """SELECT id, name, type, site, is_default, created_at
               FROM exchange_accounts
               ORDER BY created_at DESC"""
        )
    )
    rows = result.mappings().all()
    return {"accounts": [dict(row) for row in rows]}
