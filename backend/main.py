"""API principal do SugarVision desenvolvida em FastAPI.

Arquitetura orientada a serviços (Service-Oriented Architecture), com injeção de dependência
(FastAPI Depends), streaming assíncrono não-bloqueante e cache singleton de IA.
"""

import logging
from pathlib import Path
from typing import Any, List

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from ai_engine import DEFAULT_MODEL_PATH, processar_imagem_ia
from app.core.config import (
    AI_DELAY_SECONDS,
    ALLOWED_IMAGE_EXTENSIONS,
    BASE_DIR,
    TEMP_IMAGES_DIR,
)
from app.core.dependencies import (
    get_ai_service,
    get_anomaly_service,
    get_storage_service,
)
from app.services.ai_service import AIService
from app.services.anomaly_service import AnomalyService
from app.services.storage_service import StorageService
from database import check_connection, get_all_anomalies

# Configuração de logging estruturado
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sugarvision-api")

# Exportações para compatibilidade direta com scripts existentes
MODEL_PATH = DEFAULT_MODEL_PATH

# Inicialização da aplicação
app = FastAPI(
    title="SugarVision API",
    description="API de visão computacional e backend com arquitetura de microserviços",
    version="2.0.0",
)

# Habilitar CORS para o frontend (Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi.staticfiles import StaticFiles

# Montar diretório de imagens temporárias para acesso estático pelo frontend
app.mount("/temp_images", StaticFiles(directory=TEMP_IMAGES_DIR), name="temp_images")


@app.get("/")
async def read_root() -> dict[str, str]:
    """Endpoint raiz para verificar disponibilidade da API."""
    return {"status": "servidor online"}


@app.get("/health")
async def health_check(
    anomaly_service: AnomalyService = Depends(get_anomaly_service),
) -> dict[str, Any]:
    """Verifica o status da API e a conectividade com o banco de dados Supabase."""
    db_status = await anomaly_service.check_health_async()
    return {
        "api": "online",
        "database": db_status,
    }


@app.get("/api/anomalies", response_model=List[dict[str, Any]])
async def get_anomalies(
    anomaly_service: AnomalyService = Depends(get_anomaly_service),
) -> List[dict[str, Any]]:
    """Retorna todas as falhas cadastradas no banco de dados para o mapa.

    Executa consulta assíncrona na tabela de anomalias do banco de dados e retorna
    uma lista no formato JSON compatível com o mapa do frontend.
    """
    return await anomaly_service.get_all_anomalies_async()


@app.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    storage_service: StorageService = Depends(get_storage_service),
    ai_service: AIService = Depends(get_ai_service),
) -> dict[str, Any]:
    """Recebe uma imagem enviada pelo frontend e salva em disco de forma assíncrona.

    Utiliza injeção de dependência para StorageService e AIService.
    Executa gravação em stream assíncrono em chunks para suporte eficiente a imagens
    pesadas sem travar o Event Loop, e BackgroundTasks para acionar a IA após o upload.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum arquivo ou nome de arquivo fornecido.",
        )

    # Validação da extensão via serviço de armazenamento
    storage_service.validate_extension(file.filename)

    try:
        # Gravação assíncrona não-bloqueante
        target_path, file_size = await storage_service.save_image_async(file)

        # Executa a inferência direta para gerar as bounding boxes de ervas daninhas para o frontend
        ai_result = await ai_service.detect_image_async(target_path, model_path=MODEL_PATH)

        # Dispara o processamento em segundo plano sem congelar a resposta para o usuário
        if background_tasks is not None:
            background_tasks.add_task(
                processar_imagem_ia,
                target_path,
                AI_DELAY_SECONDS,
                MODEL_PATH,
            )
            logger.info(
                "Gatilho de IA agendado em segundo plano (delay: %.1fs): %s",
                AI_DELAY_SECONDS,
                target_path.name,
            )

        return {
            "status": "success",
            "message": "Imagem enviada e processada com sucesso.",
            "filename": target_path.name,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": file_size,
            "saved_path": str(target_path),
            "ai_status": "enqueued" if background_tasks is not None else "skipped",
            "detections": ai_result.get("detections", []),
            "summary": ai_result.get("summary", {}),
        }

    finally:
        await file.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
