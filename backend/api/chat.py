"""
对话路由 — 用户通过 Web UI 与 Hermes Agent 真实对话

核心逻辑：
  1. 接收用户发送的消息
  2. 通过 hermes_runner.run_hermes_chat() 调用 hermes chat 子进程
  3. 将结果返回给前端（含思维链）

注意：这是"让 Hermes 做任何事"的通用入口。
"""

import logging
from fastapi import APIRouter, Depends

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from core.database import get_db
from core.hermes_runner import run_hermes_chat, get_hermes_status

logger = logging.getLogger("chat_router")
router = APIRouter()


# ---------- 请求/响应模型 ----------

class ChatRequest(BaseModel):
    message: str
    trader_id: str | None = None  # 关联的交易员 ID（可选）


class ChatResponse(BaseModel):
    success: bool
    reply: str
    error: str | None = None
    exit_code: int = 0


class HermesStatusResponse(BaseModel):
    installed: bool
    running: bool
    version: str | None = None
    path: str | None = None


# ---------- 路由 ----------

@router.post("/chat", response_model=ChatResponse)
async def chat_with_hermes(req: ChatRequest):
    """
    发送消息给 Hermes Agent 并获取回复

    这是"用户对话框"的核心路由。
    每次调用都会启动一个 hermes chat 子进程，返回真实回复。
    """
    if not req.message.strip():
        return ChatResponse(success=False, reply="", error="消息不能为空", exit_code=-1)

    # 构建完整的 prompt：注入系统上下文
    context_prompt = (
        "你是一个加密货币交易系统的 AI 助手 Hermes Agent。\n"
        "你有以下能力:\n"
        "1. 通过工具查询实时行情\n"
        "2. 调用 OKX MCP 执行交易\n"
        "3. 查询服务器状态和日志\n"
        "4. 管理交易策略和定时任务\n\n"
        f"用户消息: {req.message}"
    )

    result = await run_hermes_chat(
        prompt=context_prompt,
        trader_id=req.trader_id,
        timeout=120,
    )

    return ChatResponse(
        success=result["success"],
        reply=result["output"] or (result["error"] or "（无回复）"),
        error=result["error"],
        exit_code=result["exit_code"],
    )


@router.get("/chat/hermes-status", response_model=HermesStatusResponse)
async def check_hermes_status():
    """获取 Hermes Agent 的安装和运行状态"""
    status = get_hermes_status()
    return HermesStatusResponse(**status)
