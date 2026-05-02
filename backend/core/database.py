"""
异步 SQLAlchemy 数据库连接模块

提供:
- 基于 asyncpg 的异步引擎和会话工厂
- get_db() 依赖注入 (用于 FastAPI)
- init_db() 初始化函数 (创建所有表)
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

# ---------- 引擎 ----------

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# ---------- 会话工厂 ----------

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ---------- Declarative Base ----------

class Base(DeclarativeBase):
    """所有 ORM 模型的基类"""
    pass


# ---------- 依赖注入 ----------

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 依赖注入，每个请求提供一个独立的数据库会话。"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ---------- 初始化 ----------

async def init_db() -> None:
    """创建所有未创建的数据库表。

    注意: 不会执行迁移 (migration)；生产环境请使用 Alembic。
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
