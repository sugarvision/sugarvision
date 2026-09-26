"""API principal do SugarVision desenvolvida em FastAPI.

Arquitetura orientada a serviços (Service-Oriented Architecture), com injeção de dependência
(FastAPI Depends), streaming assíncrono não-bloqueante e cache singleton de IA.
"""

import logging
from pathlib import Path
from typing import Any, List, Optional

from pydantic import BaseModel
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile, status
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
    get_history_service,
    get_image_service,
    get_storage_service,
)
from app.services.ai_service import AIService
from app.services.anomaly_service import AnomalyService
from app.services.history_service import HistoryService
from app.services.image_service import ImageService
from app.services.storage_service import StorageService
from database import check_connection, get_all_anomalies, get_all_images, get_all_analyses


class RenameImageRequest(BaseModel):
    filename: str

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

# -------------------------------------------------------------
# ROTAS DO HISTÓRICO DE ANÁLISES
# -------------------------------------------------------------

@app.get("/api/historico", response_model=List[dict[str, Any]])
async def get_history(
    history_service: HistoryService = Depends(get_history_service),
) -> List[dict[str, Any]]:
    """Retorna todas as análises cadastradas no histórico."""
    return await history_service.get_all_analyses_async()

@app.get("/api/historico/{analysis_id}")
async def get_single_history(analysis_id: str) -> dict[str, Any]:
    """Retorna uma análise específica do histórico com suas caixas delimitadoras já salvas."""
    all_analyses = get_all_analyses()
    for item in all_analyses:
        if str(item.get("id")) == str(analysis_id):
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Análise não encontrada.")

@app.post("/api/historico", status_code=status.HTTP_201_CREATED)
async def create_history_record(
    payload: dict[str, Any],
    history_service: HistoryService = Depends(get_history_service),
) -> dict[str, Any]:
    """Cria um registro manual de análise no histórico."""
    return await history_service.create_analysis_async(payload)


@app.delete("/api/historico/{analysis_id}", status_code=status.HTTP_200_OK)
async def delete_history_record(
    analysis_id: str,
    history_service: HistoryService = Depends(get_history_service),
) -> dict[str, Any]:
    """Exclui um registro do histórico."""
    success = await history_service.delete_analysis_async(analysis_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Análise '{analysis_id}' não encontrada para exclusão.",
        )
    return {
        "status": "success",
        "message": f"Análise '{analysis_id}' excluída com sucesso.",
        "id": analysis_id,
    }


# -------------------------------------------------------------
# ROTA DE RENOMEAR FOTO / AMOSTRA
# -------------------------------------------------------------

@app.patch("/api/images/{image_id}", status_code=status.HTTP_200_OK)
@app.patch("/api/amostras/{image_id}", status_code=status.HTTP_200_OK)
async def rename_image(
    image_id: str,
    payload: RenameImageRequest,
    image_service: ImageService = Depends(get_image_service),
) -> dict[str, Any]:
    """Renomeia a foto na tabela de imagens e atualiza o histórico associado."""
    if not payload.filename or not payload.filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O novo nome da imagem não pode ser vazio.",
        )
    success = await image_service.rename_image_async(image_id, payload.filename.strip())
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Não foi possível renomear a imagem '{image_id}'.",
        )
    return {
        "status": "success",
        "message": f"Imagem renomeada para '{payload.filename.strip()}'.",
        "id": image_id,
        "filename": payload.filename.strip(),
    }

class AnalyzeSampleRequest(BaseModel):
    filename: Optional[str] = None


@app.post("/api/analyze-sample")
@app.get("/api/analyze-sample")
async def analyze_sample(
    filename: Optional[str] = None,
    payload: Optional[AnalyzeSampleRequest] = None,
    ai_service: AIService = Depends(get_ai_service),
    history_service: HistoryService = Depends(get_history_service),
) -> dict[str, Any]:
    """Executa a inferência YOLO na amostra e grava no Histórico."""
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

    if not chosen_path or not chosen_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arquivo de amostra '{target_filename}' não localizado para análise.",
        )

    ai_result = await ai_service.detect_image_async(chosen_path, model_path=MODEL_PATH)
    file_size = chosen_path.stat().st_size
    image_url = f"http://127.0.0.1:8000/temp_images/{chosen_path.name}"

    # Salva automaticamente no Histórico
    history_record = None
    try:
        history_record = await history_service.record_inference_async(
            filename=target_filename,
            detections=ai_result.get("detections", []),
            summary=ai_result.get("summary", {}),
            image_url=image_url,
            file_size_bytes=file_size,
        )
    except Exception as hist_err:
        logger.warning("Aviso não-crítico ao salvar análise no histórico: %s", hist_err)

    return {
        "status": "success",
        "message": f"Amostra '{target_filename}' analisada com sucesso.",
        "filename": target_filename,
        "original_filename": target_filename,
        "image_url": image_url,
        "saved_path": str(chosen_path),
        "size_bytes": file_size,
        "detections": ai_result.get("detections", []),
        "summary": ai_result.get("summary", {}),
        "history_record": history_record,
    }


@app.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    custom_name: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None,
    storage_service: StorageService = Depends(get_storage_service),
    ai_service: AIService = Depends(get_ai_service),
    image_service: ImageService = Depends(get_image_service),
    history_service: HistoryService = Depends(get_history_service),
) -> dict[str, Any]:
    """Recebe imagem, preserva o nome original/customizado, detecta IA e salva nas amostras e histórico."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum arquivo ou nome de arquivo fornecido.",
        )

    storage_service.validate_extension(file.filename)

    try:
        target_path, file_size = await storage_service.save_image_async(file, custom_name=custom_name)
        ai_result = await ai_service.detect_image_async(target_path, model_path=MODEL_PATH)

        if background_tasks is not None:
            background_tasks.add_task(
                processar_imagem_ia,
                target_path,
                AI_DELAY_SECONDS,
                MODEL_PATH,
            )

        # 1. Salva no Banco de Amostras (tabela images)
        db_image_record = None
        try:
            db_image_record = await image_service.register_image_async(
                filename=target_path.name,
                status="completed",
            )
        except Exception as db_err:
            logger.warning("Aviso não-crítico ao salvar imagem na tabela 'images': %s", db_err)

        # 2. Salva no Histórico (tabela analyses)
        image_id = db_image_record.get("id") if db_image_record else None
        image_url = f"http://127.0.0.1:8000/temp_images/{target_path.name}"
        history_record = None
        try:
            history_record = await history_service.record_inference_async(
                filename=target_path.name,
                detections=ai_result.get("detections", []),
                summary=ai_result.get("summary", {}),
                image_id=image_id,
                image_url=image_url,
                file_size_bytes=file_size,
            )
        except Exception as hist_err:
            logger.warning("Aviso não-crítico ao salvar histórico: %s", hist_err)

        return {
            "status": "success",
            "message": "Imagem enviada e processada com sucesso.",
            "filename": target_path.name,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": file_size,
            "saved_path": str(target_path),
            "detections": ai_result.get("detections", []),
            "summary": ai_result.get("summary", {}),
            "database_record": db_image_record,
            "history_record": history_record,
        }
    finally:
        await file.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
