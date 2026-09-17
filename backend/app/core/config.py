"""Configurações globais e variáveis de ambiente do backend SugarVision."""

import os
from pathlib import Path
from typing import Set

from dotenv import load_dotenv

# Localização base do backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# Configurações de Diretórios
TEMP_IMAGES_DIR: Path = BASE_DIR / "temp_images"
TEMP_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_MODEL_PATH: Path = BASE_DIR / "best.pt"

# Extensões suportadas para processamento de imagens UAV
ALLOWED_IMAGE_EXTENSIONS: Set[str] = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tiff",
}

# Configurações de Inteligência Artificial
AI_DELAY_SECONDS: float = float(os.getenv("AI_DELAY_SECONDS", "1.0"))

# Configurações do Banco de Dados / Supabase
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
DB_HOST: str = os.getenv("DB_HOST", "db.hbropsjrbebbuiwcjrcu.supabase.co")
DB_PORT: str = os.getenv("DB_PORT", "5432")
DB_USER: str = os.getenv("DB_USER", "postgres")
DB_NAME: str = os.getenv("DB_NAME", "postgres")
