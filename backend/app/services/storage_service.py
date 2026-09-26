"""Serviço assíncrono de armazenamento e manipulação de arquivos de imagem."""

import asyncio
import logging
from pathlib import Path
import uuid
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile, status

from app.core.config import ALLOWED_IMAGE_EXTENSIONS, TEMP_IMAGES_DIR

logger = logging.getLogger("sugarvision-storage")


class StorageService:
    """Microserviço responsável pela validação, gravação em stream e limpeza de imagens."""

    def __init__(self, target_dir: Path = TEMP_IMAGES_DIR):
        self.target_dir = target_dir
        self.target_dir.mkdir(parents=True, exist_ok=True)

    def validate_extension(self, filename: str) -> str:
        """Valida e retorna a extensão sanitizada do arquivo.

        Levanta HTTPException 400 se o formato não for suportado.
        """
        if not filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum arquivo ou nome de arquivo fornecido.",
            )

        extension = Path(filename).suffix.lower()
        if extension not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Formato de arquivo '{extension}' não suportado. "
                    f"Formatos aceitos: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
                ),
            )
        return extension

    def generate_safe_filename(self, original_filename: str, custom_name: Optional[str] = None) -> str:
        """Gera nome seguro preservando o nome original do arquivo ou o nome customizado pelo usuário."""
        base_name = custom_name.strip() if custom_name and custom_name.strip() else original_filename
        original_path = Path(base_name)
        extension = self.validate_extension(original_filename)
        clean_stem = "".join(c for c in original_path.stem if c.isalnum() or c in (" ", "_", "-")).strip()
        if not clean_stem:
            clean_stem = "amostra"

        candidate = f"{clean_stem}{extension}"
        target = self.target_dir / candidate
        if not target.exists():
            return candidate

        counter = 1
        while counter < 1000:
            candidate = f"{clean_stem} ({counter}){extension}"
            target = self.target_dir / candidate
            if not target.exists():
                return candidate
            counter += 1

        return f"{clean_stem}_{uuid.uuid4().hex[:6]}{extension}"

    async def save_image_async(
        self, file: UploadFile, custom_name: Optional[str] = None, chunk_size: int = 1024 * 1024
    ) -> Tuple[Path, int]:
        """Salva a imagem no disco através de streaming assíncrono em chunks.

        Garante que o Event Loop do FastAPI permaneça desbloqueado mesmo para imagens grandes de drones.

        Args:
            file: Arquivo recebido do upload FastAPI.
            custom_name: Nome customizado opcional fornecido pelo usuário.
            chunk_size: Tamanho do chunk em bytes (padrão: 1MB).

        Returns:
            Tupla contendo (caminho_do_arquivo_salvo, tamanho_total_bytes).
        """
        safe_filename = self.generate_safe_filename(file.filename or "upload.jpg", custom_name=custom_name)
        target_path = self.target_dir / safe_filename

        try:
            # Função síncrona executada em worker thread para não travar o loop
            def write_file() -> int:
                total_bytes = 0
                with open(target_path, "wb") as buffer:
                    while True:
                        chunk = file.file.read(chunk_size)
                        if not chunk:
                            break
                        buffer.write(chunk)
                        total_bytes += len(chunk)
                return total_bytes

            total_bytes = await asyncio.to_thread(write_file)

            logger.info(
                "Imagem salva assincronamente com sucesso: %s (%d bytes)",
                safe_filename,
                total_bytes,
            )
            return target_path, total_bytes

        except Exception as exc:
            if target_path.exists():
                target_path.unlink()
            logger.error("Falha ao gravar imagem %s: %s", safe_filename, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Falha ao salvar a imagem no servidor: {exc}",
            ) from exc

    async def delete_image_async(self, image_path: Path | str) -> bool:
        """Remove o arquivo temporário do disco de forma não-bloqueante."""
        path_obj = Path(image_path)

        def remove_file() -> bool:
            if path_obj.exists() and path_obj.is_file():
                path_obj.unlink()
                return True
            return False

        return await asyncio.to_thread(remove_file)
