"""Serviço assíncrono para manipulação e consulta do banco de amostras de imagens (tabela 'images')."""

import asyncio
import logging
from typing import Any, List, Optional

from database import get_all_images, insert_image_record

logger = logging.getLogger("sugarvision-images")


class ImageService:
    """Microserviço responsável por operações na tabela 'images' do banco de dados."""

    async def get_all_images_async(self) -> List[dict[str, Any]]:
        """Busca todas as amostras de imagens registradas no banco de forma assíncrona.

        Executa a consulta na tabela 'images' via psycopg2 em worker thread
        dedicada para evitar qualquer bloqueio no Event Loop da API.
        """
        return await asyncio.to_thread(get_all_images)

    async def register_image_async(
        self,
        filename: str,
        status: str = "completed",
        image_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Registra uma nova amostra de imagem na tabela 'images' de forma assíncrona."""
        return await asyncio.to_thread(insert_image_record, filename, status, image_id)
