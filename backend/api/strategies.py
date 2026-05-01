"""策略管理 API"""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_strategies():
    """列出所有策略"""
    return {"strategies": []}


@router.post("")
async def create_strategy(data: dict):
    """新建策略"""
    return {"id": "new-id", "name": data.get("name")}


@router.get("/{strategy_id}")
async def get_strategy(strategy_id: str):
    """获取策略详情（含所有版本）"""
    return {"id": strategy_id, "name": "", "versions": []}


@router.put("/{strategy_id}")
async def update_strategy(strategy_id: str, data: dict):
    """保存新版本（迭代）"""
    return {"id": strategy_id, "new_version": "v3"}


@router.delete("/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """删除策略（使用中禁止删除）"""
    return {"status": "deleted"}
