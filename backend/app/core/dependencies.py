"""Provedores de injeção de dependência para os endpoints do FastAPI."""

from functools import lru_cache

from app.services.ai_service import AIService
from app.services.anomaly_service import AnomalyService
from app.services.storage_service import StorageService


@lru_cache(maxsize=1)
def get_storage_service() -> StorageService:
    """Provedor singleton do serviço de armazenamento em disco."""
    return StorageService()


@lru_cache(maxsize=1)
def get_ai_service() -> AIService:
    """Provedor singleton do serviço de Inteligência Artificial com cache do modelo YOLO."""
    return AIService()


@lru_cache(maxsize=1)
def get_anomaly_service() -> AnomalyService:
    """Provedor singleton do serviço de anomalias e conexão com banco."""
    return AnomalyService()
