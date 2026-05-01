import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "Crypto AI Trader"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://crypto:crypto_pass@localhost:5432/crypto_trader"

    # 项目路径
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent
    PLUGINS_DIR: Path = PROJECT_ROOT / "plugins"
    CONFIG_DIR: Path = Path(os.path.expanduser("~/.okx"))

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:8080", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
