"""Serviço assíncrono para consulta e persistência de anomalias e falhas agrícolas."""

import asyncio
import logging
from typing import Any, List

from database import check_connection, get_all_anomalies

logger = logging.getLogger("sugarvision-anomalies")


class AnomalyService:
    """Microserviço responsável pelas consultas e manipulação de falhas/anomalias."""

    async def get_all_anomalies_async(self) -> List[dict[str, Any]]:
        """Busca todas as anomalias no banco de dados de forma assíncrona.

        Executa a consulta no banco Supabase dentro de worker thread via
        asyncio.to_thread para prevenir bloqueio de rede no Event Loop.
        """
        return await asyncio.to_thread(get_all_anomalies)

    async def check_health_async(self) -> dict[str, Any]:
        """Verifica a conectividade do banco de forma assíncrona."""
        return await asyncio.to_thread(check_connection)
