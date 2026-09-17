"""API principal do SugarVision desenvolvida em FastAPI.

Fornece endpoints para status do servidor, verificação de saúde do banco de dados
e recebimento/armazenamento temporário de imagens enviadas pelo frontend.
"""

import logging
import os
from pathlib import Path
import shutil
import uuid
from typing import Any

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from ai_engine import DEFAULT_MODEL_PATH, processar_imagem_ia
from database import check_connection

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sugarvision-api")

# Configuração de diretórios e modelos
BASE_DIR = Path(__file__).resolve().parent
TEMP_IMAGES_DIR = BASE_DIR / "temp_images"
TEMP_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = DEFAULT_MODEL_PATH

# Configuração de tempo para despertar a IA após o upload (padrão: 1.0 segundo)
AI_DELAY_SECONDS: float = float(os.getenv("AI_DELAY_SECONDS", "1.0"))

# Extensões de imagens suportadas
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}

# Inicialização da aplicação
app = FastAPI(
    title="SugarVision API",
    description="API de visão computacional e backend do projeto SugarVision",
    version="1.0.0",
)

# Habilitar CORS para permitir requisições do frontend (Next.js na porta 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    """Endpoint raiz para verificar disponibilidade da API."""
    return {"status": "servidor online"}


@app.get("/health")
def health_check() -> dict[str, Any]:
    """Verifica o status da API e a conectividade com o banco de dados."""
    db_status = check_connection()
    return {
        "api": "online",
        "database": db_status,
    }


@app.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
) -> dict[str, Any]:
    """Recebe uma imagem enviada pelo frontend e salva na pasta temp_images/.

    Utiliza UploadFile do FastAPI para suporte eficiente a arquivos grandes através
    de streaming direto para o disco, evitando alto consumo de memória RAM.
    Utiliza BackgroundTasks para disparar automaticamente a avaliação da IA 1 segundo
    após o upload sem travar a interface do usuário.

    Args:
        file: Arquivo de imagem enviado via multipart/form-data.
        background_tasks: Instância injetada pelo FastAPI para execução em segundo plano.

    Returns:
        Dicionário com metadados do arquivo salvo e status da operação.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum arquivo ou nome de arquivo fornecido.",
        )

    # Sanitização e validação da extensão do arquivo
    original_path = Path(file.filename)
    extension = original_path.suffix.lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Formato de arquivo '{extension}' não suportado. "
                f"Formatos aceitos: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
            ),
        )

    # Gera nome único seguro para evitar colisão e ataques de directory traversal
    clean_stem = original_path.stem.replace(" ", "_")
    safe_filename = f"{uuid.uuid4().hex[:8]}_{clean_stem}{extension}"
    target_path = TEMP_IMAGES_DIR / safe_filename

    try:
        # Gravação em stream do arquivo para suporte eficiente a imagens grandes
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = target_path.stat().st_size
        logger.info(
            "Arquivo salvo com sucesso: %s (%d bytes, tipo: %s)",
            safe_filename,
            file_size,
            file.content_type,
        )

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
                safe_filename,
            )

        return {
            "status": "success",
            "message": "Imagem enviada e salva com sucesso.",
            "filename": safe_filename,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": file_size,
            "saved_path": str(target_path),
            "ai_status": "enqueued" if background_tasks is not None else "skipped",
        }

    except Exception as exc:
        # Em caso de erro na gravação, remove o arquivo incompleto caso exista
        if target_path.exists():
            target_path.unlink()
        logger.error("Erro ao salvar o arquivo %s: %s", safe_filename, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao salvar a imagem no servidor: {exc}",
        ) from exc

    finally:
        # Libera os recursos do arquivo temporário do FastAPI
        await file.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
