"""Provedores de injeção de dependência para os endpoints do FastAPI."""

from functools import lru_cache

from app.services.ai_service import AIService
from app.services.detection_service import DetectionService
from app.services.health_service import HealthService
from app.services.image_service import ImageService
from app.services.history_service import HistoryService
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
def get_detection_service() -> DetectionService:
    """Provedor singleton do serviço de detecções e conexão com banco."""
    return DetectionService()


@lru_cache(maxsize=1)
def get_image_service() -> ImageService:
    """Provedor singleton do serviço do banco de imagens/amostras."""
    return ImageService()


@lru_cache(maxsize=1)
def get_history_service() -> HistoryService:
    """Provedor singleton do serviço de histórico de análises."""
    return HistoryService()


@lru_cache(maxsize=1)
def get_health_service() -> HealthService:
    """Provedor singleton do healthcheck (modelo, RAM e banco), compartilhando os demais singletons."""
    return HealthService(get_ai_service(), get_detection_service())
