"""Serviço assíncrono para consulta e persistência de detecções e falhas agrícolas."""

import asyncio
import logging
from typing import Any, List

from database import check_connection, get_all_detections

logger = logging.getLogger("sugarvision-detections")


class DetectionService:
    """Microserviço responsável pelas consultas e manipulação de detecções."""

    async def get_all_detections_async(self) -> List[dict[str, Any]]:
        """Busca todas as detecções no banco de dados de forma assíncrona.

        Executa a consulta no banco Supabase dentro de worker thread via
        asyncio.to_thread para prevenir bloqueio de rede no Event Loop.
        """
        return await asyncio.to_thread(get_all_detections)

    async def check_health_async(self) -> dict[str, Any]:
        """Verifica a conectividade do banco de forma assíncrona."""
        return await asyncio.to_thread(check_connection)
