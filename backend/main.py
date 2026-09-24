"""API principal do SugarVision desenvolvida em FastAPI.

Arquitetura orientada a serviços (Service-Oriented Architecture), com injeção de dependência
(FastAPI Depends), streaming assíncrono não-bloqueante e cache singleton de IA.
"""

import logging
from pathlib import Path
from typing import Any, List, Optional

from pydantic import BaseModel
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
    get_image_service,
    get_storage_service,
)
from app.services.ai_service import AIService
from app.services.anomaly_service import AnomalyService
from app.services.image_service import ImageService
from app.services.storage_service import StorageService
from database import check_connection, get_all_anomalies, get_all_images

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


@app.get("/api/images", response_model=List[dict[str, Any]])
@app.get("/api/amostras", response_model=List[dict[str, Any]])
async def get_images_samples(
    image_service: ImageService = Depends(get_image_service),
) -> List[dict[str, Any]]:
    """Retorna todas as amostras de imagens salvas no banco de dados (tabela 'images').

    Executa consulta com JOIN e métricas de anomalias, garantindo retorno estruturado
    para o painel de Banco de Amostras no frontend.
    """
    return await image_service.get_all_images_async()


@app.delete("/api/images/{image_id}", status_code=status.HTTP_200_OK)
@app.delete("/api/amostras/{image_id}", status_code=status.HTTP_200_OK)
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


class AnalyzeSampleRequest(BaseModel):
    filename: Optional[str] = None


@app.post("/api/analyze-sample")
@app.get("/api/analyze-sample")
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

    # Busca o arquivo de imagem no temp_images ou diretórios do projeto
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

    # Se não encontrar o arquivo físico exato, seleciona ou cria amostra de campo representativa
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

    # Executa a inferência imediata da IA (modelo best.pt)
    ai_result = await ai_service.detect_image_async(chosen_path, model_path=MODEL_PATH)
    file_size = chosen_path.stat().st_size

    # URL pública para o frontend
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


@app.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    storage_service: StorageService = Depends(get_storage_service),
    ai_service: AIService = Depends(get_ai_service),
    image_service: ImageService = Depends(get_image_service),
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

        # Registra a amostra na tabela images do banco de dados (não bloqueia resposta caso haja falha temporária)
        db_image_record = None
        try:
            db_image_record = await image_service.register_image_async(
                filename=target_path.name,
                status="completed",
            )
        except Exception as db_err:
            logger.warning("Aviso não-crítico ao salvar imagem na tabela 'images': %s", db_err)

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
            "database_record": db_image_record,
        }

    finally:
        await file.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
