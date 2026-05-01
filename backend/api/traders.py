"""交易员管理 API"""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_traders():
    """列出所有交易员"""
    return {"traders": []}


@router.post("")
async def create_trader(data: dict):
    """创建交易员"""
    return {"id": "new-trader-id", "name": data.get("name")}


@router.get("/{trader_id}")
async def get_trader(trader_id: str):
    """获取交易员详情"""
    return {"id": trader_id}


@router.post("/{trader_id}/start")
async def start_trader(trader_id: str):
    """启动交易员"""
    return {"status": "started"}


@router.post("/{trader_id}/stop")
async def stop_trader(trader_id: str):
    """停止交易员"""
    return {"status": "stopped"}


@router.delete("/{trader_id}")
async def delete_trader(trader_id: str):
    """删除交易员"""
    return {"status": "deleted"}
