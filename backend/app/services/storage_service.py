"""Serviço assíncrono de armazenamento e manipulação de arquivos de imagem."""

import asyncio
import logging
import time
from pathlib import Path
import uuid
from typing import Any, Dict, Optional, Set, Tuple

from fastapi import HTTPException, UploadFile, status

from app.core.config import ALLOWED_IMAGE_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB, TEMP_IMAGES_DIR

logger = logging.getLogger("sugarvision-storage")

# Arquivos essenciais de contingência, mocks e sistema que não devem ser removidos na limpeza
PROTECTED_TEMP_FILES: Set[str] = {
    ".gitkeep",
    "cana_teste.jpg",
    "amostra_erva_daninha.jpg",
    "trigo_teste.png",
}



class StorageService:
    """Microserviço responsável pela validação, gravação em stream e limpeza de imagens."""

    def __init__(self, target_dir: Path = TEMP_IMAGES_DIR, max_size_bytes: int = MAX_UPLOAD_SIZE_BYTES):
        self.target_dir = target_dir
        self.max_size_bytes = max_size_bytes
        self.target_dir.mkdir(parents=True, exist_ok=True)

    def _size_limit_error(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Arquivo excede o tamanho máximo permitido de "
                f"{self.max_size_bytes / (1024 * 1024):g} MB."
            ),
        )

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

        declared_size = getattr(file, "size", None)
        if declared_size is not None and declared_size > self.max_size_bytes:
            raise self._size_limit_error()

        try:
            # Função síncrona executada em worker thread para não travar o loop
            def write_file() -> int:
                total_bytes = 0
                with open(target_path, "wb") as buffer:
                    while True:
                        chunk = file.file.read(chunk_size)
                        if not chunk:
                            break
                        total_bytes += len(chunk)
                        if total_bytes > self.max_size_bytes:
                            raise self._size_limit_error()
                        buffer.write(chunk)
                return total_bytes

            total_bytes = await asyncio.to_thread(write_file)

            logger.info(
                "Imagem salva assincronamente com sucesso: %s (%d bytes)",
                safe_filename,
                total_bytes,
            )
            return target_path, total_bytes

        except HTTPException:
            if target_path.exists():
                target_path.unlink()
            logger.warning("Upload rejeitado por exceder %d MB: %s", MAX_UPLOAD_SIZE_MB, safe_filename)
            raise
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
 
    async def cleanup_temp_images(
        self,
        days: int = 7,
        protected_files: Optional[Set[str]] = None,
    ) -> Dict[str, Any]:
        """Varre o diretório temporário de uploads (temp_images) e remove imagens com mais de `days` dias.

        Atende integralmente aos requisitos da Sprint 7:
        - Varre o diretório temporário usando Path(target_dir).glob("*").
        - Aplica a regra de expiração para imagens com mais de `days` dias (padrão: 7 dias).
        - Chama o método assíncrono `delete_image_async` para cada arquivo antigo qualificado.
        - Preserva arquivos essenciais de sistema, mock e contingência.

        Args:
            days: Limiar de expiração em dias corridos (padrão: 7).
            protected_files: Conjunto customizado de arquivos protegidos (opcional).

        Returns:
            Dict com estatísticas detalhadas da operação (scanned, deleted, skipped_recent, skipped_protected, errors).
        """
        now = time.time()
        max_age_seconds = days * 86400.0
        protected = set(protected_files) if protected_files is not None else PROTECTED_TEMP_FILES

        stats: Dict[str, Any] = {
            "scanned": 0,
            "deleted": 0,
            "skipped_protected": 0,
            "skipped_recent": 0,
            "errors": 0,
            "deleted_files": [],
        }

        # Varredura do diretório temporário
        for item in self.target_dir.glob("*"):
            if not item.is_file():
                continue

            stats["scanned"] += 1
            filename = item.name

            # Preserva arquivos essenciais e ocultos/sistema
            if filename in protected or filename.startswith("."):
                stats["skipped_protected"] += 1
                continue

            try:
                stat_info = item.stat()
                file_age_seconds = now - stat_info.st_mtime

                if file_age_seconds > max_age_seconds:
                    success = await self.delete_image_async(item)
                    if success:
                        stats["deleted"] += 1
                        stats["deleted_files"].append(filename)
                        logger.info(
                            "Imagem temporária com mais de %d dias removida: %s (idade: %.1f dias)",
                            days,
                            filename,
                            file_age_seconds / 86400.0,
                        )
                    else:
                        stats["errors"] += 1
                else:
                    stats["skipped_recent"] += 1
            except Exception as exc:
                stats["errors"] += 1
                logger.warning("Erro ao verificar/remover arquivo temporário %s: %s", item, exc)

        logger.info(
            "Limpeza de arquivos temporários concluída (> %d dias): %d escaneados, %d deletados, %d recentes, %d protegidos, %d erros.",
            days,
            stats["scanned"],
            stats["deleted"],
            stats["skipped_recent"],
            stats["skipped_protected"],
            stats["errors"],
        )
        return stats

    def cleanup_temp_images_sync(
        self,
        days: int = 7,
        protected_files: Optional[Set[str]] = None,
    ) -> Dict[str, Any]:
        """Versão síncrona/utilitária para chamadas diretas via CLI ou scripts standalone."""
        return asyncio.run(self.cleanup_temp_images(days=days, protected_files=protected_files))

