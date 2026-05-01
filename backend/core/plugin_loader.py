"""插件基类和加载器"""

from abc import ABC, abstractmethod
from typing import Optional
from fastapi import APIRouter, FastAPI


class BasePlugin(ABC):
    """所有插件的基类
    
    新插件只需继承此类并实现接口方法，
    系统启动时自动发现并注册。
    """

    @abstractmethod
    def get_info(self) -> dict:
        """返回插件信息：名称、版本、描述"""
        pass

    @abstractmethod
    def register_routes(self, router: APIRouter):
        """注册 API 路由"""
        pass

    def register_websocket(self):
        """可选：注册 WebSocket 事件"""
        pass

    def on_startup(self, app: FastAPI):
        """可选：应用启动时初始化"""
        pass

    def on_shutdown(self, app: FastAPI):
        """可选：应用关闭时清理"""
        pass


class PluginLoader:
    """插件加载器：自动发现并加载 plugins/ 目录下的插件"""

    def __init__(self, plugins_dir: str):
        self.plugins_dir = plugins_dir
        self.plugins: dict[str, BasePlugin] = {}

    def discover_and_load(self) -> list[dict]:
        """扫描 plugins/ 目录，加载所有插件"""
        # TODO: 自动扫描和加载
        return []

    def get_plugin(self, name: str) -> Optional[BasePlugin]:
        return self.plugins.get(name)

    def get_all_plugins_info(self) -> list[dict]:
        return [p.get_info() for p in self.plugins.values()]
