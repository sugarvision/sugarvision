"""Roteador principal do FastAPI com injeção de dependência e endpoints assíncronos."""

import logging
from typing import Any, List

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, status

from app.core.config import AI_DELAY_SECONDS
from app.core.dependencies import (
    get_ai_service,
    get_anomaly_service,
    get_storage_service,
)
from app.services.ai_service import AIService
from app.services.anomaly_service import AnomalyService
from app.services.storage_service import StorageService

logger = logging.getLogger("sugarvision-api")

api_router = APIRouter()


@api_router.get("/")
async def read_root() -> dict[str, str]:
    """Endpoint raiz para verificação rápida de disponibilidade do servidor."""
    return {"status": "servidor online"}


@api_router.get("/health")
async def health_check(
    anomaly_service: AnomalyService = Depends(get_anomaly_service),
) -> dict[str, Any]:
    """Verifica a saúde da API e o status de conexão com o banco de dados Supabase."""
    db_status = await anomaly_service.check_health_async()
    return {
        "api": "online",
        "database": db_status,
    }


@api_router.get("/api/anomalies", response_model=List[dict[str, Any]])
async def get_anomalies(
    anomaly_service: AnomalyService = Depends(get_anomaly_service),
) -> List[dict[str, Any]]:
    """Porta de saída de dados para o mapa.

    Executa um SELECT assíncrono na tabela de anomalias no Supabase e retorna
    uma lista JSON estruturada compatível com os polígonos do Leaflet.
    """
    return await anomaly_service.get_all_anomalies_async()


@api_router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    storage_service: StorageService = Depends(get_storage_service),
    ai_service: AIService = Depends(get_ai_service),
) -> dict[str, Any]:
    """Recebe imagens enviadas pelo frontend e agenda a avaliação pela IA.

    Utiliza streaming de disco assíncrono para suporte eficiente a arquivos pesados
    sem travar o Event Loop, e BackgroundTasks para acionar a inferência do YOLO.
    """
    try:
        # Gravação assíncrona não-bloqueante
        target_path, file_size = await storage_service.save_image_async(file)

        # Disparo assíncrono do microserviço de IA
        if background_tasks is not None:
            background_tasks.add_task(
                ai_service.process_image_async,
                target_path,
                AI_DELAY_SECONDS,
            )
            logger.info(
                "Gatilho assíncrono de IA agendado em segundo plano: %s",
                target_path.name,
            )

        return {
            "status": "success",
            "message": "Imagem enviada e salva com sucesso.",
            "filename": target_path.name,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": file_size,
            "saved_path": str(target_path),
            "ai_status": "enqueued" if background_tasks is not None else "skipped",
        }

    finally:
        await file.close()
