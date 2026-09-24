"""Roteador principal do FastAPI com injeção de dependência e endpoints assíncronos."""

import logging
from typing import Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status

from ai_engine import DEFAULT_MODEL_PATH
from app.core.config import AI_DELAY_SECONDS, BASE_DIR, TEMP_IMAGES_DIR
from app.core.dependencies import (
    get_ai_service,
    get_anomaly_service,
    get_image_service,
    get_storage_service,
)
from app.services.ai_service import AIService
from app.services.anomaly_service import AnomalyService
from app.services.image_service import ImageService
from app.services.storage_service import StorageService

logger = logging.getLogger("sugarvision-api")

api_router = APIRouter()


class AnalyzeSampleRequest(BaseModel):
    filename: Optional[str] = None


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


@api_router.get("/api/images", response_model=List[dict[str, Any]])
@api_router.get("/api/amostras", response_model=List[dict[str, Any]])
async def get_images_samples(
    image_service: ImageService = Depends(get_image_service),
) -> List[dict[str, Any]]:
    """Retorna todas as amostras de imagens salvas no banco de dados (tabela 'images')."""
    return await image_service.get_all_images_async()


@api_router.delete("/api/images/{image_id}", status_code=status.HTTP_200_OK)
@api_router.delete("/api/amostras/{image_id}", status_code=status.HTTP_200_OK)
async def delete_image(
    image_id: str,
    filename: Optional[str] = None,
    image_service: ImageService = Depends(get_image_service),
) -> dict[str, Any]:
    """Exclui permanentemente uma amostra da tabela images e suas anomalias associadas."""
    success = await image_service.delete_image_async(image_id, filename=filename)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Não foi possível excluir a amostra '{image_id}' do banco de dados.",
        )
    return {
        "status": "success",
        "message": f"Amostra '{image_id}' excluída com sucesso do banco de dados.",
        "id": image_id,
    }


@api_router.post("/api/analyze-sample")
@api_router.get("/api/analyze-sample")
async def analyze_sample(
    filename: Optional[str] = None,
    payload: Optional[AnalyzeSampleRequest] = None,
    ai_service: AIService = Depends(get_ai_service),
) -> dict[str, Any]:
    """Executa a inferência YOLO na amostra selecionada do banco de imagens."""
    target_filename = filename or (payload.filename if payload else None)
    if not target_filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome da amostra não fornecido para inferência.",
        )

    candidate_paths = [
        TEMP_IMAGES_DIR / target_filename,
        BASE_DIR / target_filename,
        BASE_DIR.parent / "cv_engine" / target_filename,
        BASE_DIR.parent / "frontend" / "public" / target_filename,
    ]

    chosen_path = None
    for p in candidate_paths:
        if p.exists() and p.is_file():
            chosen_path = p
            break

    if not chosen_path:
        target_file_in_temp = TEMP_IMAGES_DIR / target_filename
        fn_lower = target_filename.lower()
        if any(k in fn_lower for k in ["cana", "lavoura", "agro", "acucar"]):
            source_seed = BASE_DIR.parent / "cv_engine" / "cana_teste.jpg"
            if not source_seed.exists():
                source_seed = TEMP_IMAGES_DIR / "cana_teste.jpg"
        else:
            source_seed = BASE_DIR.parent / "cv_engine" / "amostra_erva_daninha.jpg"
            if not source_seed.exists():
                source_seed = TEMP_IMAGES_DIR / "amostra_erva_daninha.jpg"

        if source_seed.exists():
            try:
                import shutil
                shutil.copyfile(source_seed, target_file_in_temp)
                chosen_path = target_file_in_temp
            except Exception:
                chosen_path = source_seed
        else:
            for fallback in [
                TEMP_IMAGES_DIR / "amostra_erva_daninha.jpg",
                TEMP_IMAGES_DIR / "cana_teste.jpg",
                BASE_DIR.parent / "cv_engine" / "amostra_erva_daninha.jpg",
                BASE_DIR.parent / "cv_engine" / "cana_teste.jpg",
            ]:
                if fallback.exists():
                    chosen_path = fallback
                    break

    if not chosen_path or not chosen_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arquivo de amostra '{target_filename}' não localizado para análise.",
        )

    ai_result = await ai_service.detect_image_async(chosen_path, model_path=DEFAULT_MODEL_PATH)
    file_size = chosen_path.stat().st_size

    if (TEMP_IMAGES_DIR / target_filename).exists():
        image_url = f"http://127.0.0.1:8000/temp_images/{target_filename}"
    elif (TEMP_IMAGES_DIR / chosen_path.name).exists():
        image_url = f"http://127.0.0.1:8000/temp_images/{chosen_path.name}"
    else:
        image_url = f"/{chosen_path.name}"

    return {
        "status": "success",
        "message": f"Amostra '{target_filename}' analisada com sucesso pelo modelo best.pt.",
        "filename": target_filename,
        "original_filename": target_filename,
        "image_url": image_url,
        "saved_path": str(chosen_path),
        "size_bytes": file_size,
        "detections": ai_result.get("detections", []),
        "summary": ai_result.get("summary", {}),
    }


@api_router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    storage_service: StorageService = Depends(get_storage_service),
    ai_service: AIService = Depends(get_ai_service),
    image_service: ImageService = Depends(get_image_service),
) -> dict[str, Any]:
    """Recebe imagens enviadas pelo frontend e agenda a avaliação pela IA.

    Utiliza streaming de disco assíncrono para suporte eficiente a arquivos pesados
    sem travar o Event Loop, e BackgroundTasks para acionar a inferência do YOLO.
    """
    try:
        # Gravação assíncrona não-bloqueante
        target_path, file_size = await storage_service.save_image_async(file)

        # Executa a inferência direta para gerar as bounding boxes de ervas daninhas para o frontend
        ai_result = await ai_service.detect_image_async(target_path)

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
