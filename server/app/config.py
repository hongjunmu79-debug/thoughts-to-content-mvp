from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import dotenv_values, load_dotenv


ROOT = Path(__file__).resolve().parents[2]
SHARED_ENV = Path("/mnt/d/hermes-agents/director/hermes-home/.env")

# A project-local file wins. The shared director env is a convenience for this workspace.
load_dotenv(ROOT / ".env")
if SHARED_ENV.exists():
    load_dotenv(SHARED_ENV, override=False)
    # Empty placeholders in a copied .env should not hide usable workspace values.
    for key, value in dotenv_values(SHARED_ENV).items():
        if value and not os.getenv(key):
            os.environ[key] = value


def _database_path() -> Path:
    configured = Path(os.getenv("DATABASE_PATH", str(ROOT / "data" / "thoughts.db")))
    return configured if configured.is_absolute() else ROOT / configured


@dataclass(frozen=True)
class Settings:
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    deepseek_base_url: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash-vision-exp")
    stt_api_key: str = os.getenv("STT_API_KEY", "")
    stt_base_url: str = os.getenv("STT_BASE_URL", "https://api.openai.com/v1")
    stt_model: str = os.getenv("STT_MODEL", "whisper-1")
    database_path: Path = _database_path()
    web_origins: tuple[str, ...] = tuple(
        value.strip()
        for value in os.getenv(
            "WEB_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if value.strip()
    )


settings = Settings()
