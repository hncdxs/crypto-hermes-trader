"""WebSocket 连接管理器"""

from typing import Any
from fastapi import WebSocket
import asyncio
import json


class WebSocketManager:
    """管理所有 WebSocket 连接，向客户端推送实时数据"""

    def __init__(self):
        self._connections: dict[str, set[WebSocket]] = {}

    async def connect(self, channel: str, ws: WebSocket):
        await ws.accept()
        if channel not in self._connections:
            self._connections[channel] = set()
        self._connections[channel].add(ws)

    def disconnect(self, channel: str, ws: WebSocket):
        self._connections[channel].discard(ws)
        if not self._connections[channel]:
            del self._connections[channel]

    async def broadcast(self, channel: str, data: dict[str, Any]):
        """向指定频道的所有客户端广播消息"""
        if channel not in self._connections:
            return
        dead = set()
        for ws in self._connections[channel]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(channel, ws)


ws_manager = WebSocketManager()
