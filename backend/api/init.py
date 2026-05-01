"""项目初始化 API"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
async def get_init_status():
    """获取初始化进度：LLM配置、OKX安装、账户、子代理状态"""
    return {
        "llm_configured": False,
        "okx_installed": False,
        "accounts_count": 0,
        "agents_created": False,
    }


@router.post("/llm")
async def configure_llm(data: dict):
    """配置 LLM"""
    # 保存 LLM 配置到数据库
    return {"status": "ok"}


@router.post("/okx/install")
async def install_okx_kit():
    """安装/检查 OKX Trade Kit"""
    return {"status": "installing"}


@router.post("/accounts")
async def add_exchange_account(data: dict):
    """添加交易所账户"""
    # 写入 ~/.okx/config.toml
    return {"status": "ok"}


@router.get("/accounts")
async def list_accounts():
    """列出所有交易所账户"""
    return {"accounts": []}


@router.post("/agents/setup")
async def setup_default_agents():
    """创建默认子代理"""
    return {"status": "ok", "agents": ["master", "monitor", "executor", "risk"]}


@router.post("/complete")
async def complete_init():
    """完成初始化"""
    return {"status": "completed"}
