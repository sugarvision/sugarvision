"""Serviço de healthcheck do SugarVision: modelo de IA, memória RAM e banco de dados.

Alimenta o endpoint ``GET /api/health`` consumido pelo script de produção
(``scripts/start_production_server.ps1``) para detectar travamentos da API e do túnel.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any

from app.core.config import HEALTH_DB_TIMEOUT_SECONDS, HEALTH_MIN_FREE_RAM_GB
from app.services.ai_service import AIService
from app.services.anomaly_service import AnomalyService

try:  # psutil acompanha o ultralytics, mas não é garantido
    import psutil
except ImportError:  # pragma: no cover - depende do ambiente
    psutil = None

logger = logging.getLogger("sugarvision-health")

_GB = 1024 ** 3
_STARTED_AT = time.monotonic()


class HealthService:
    """Consolida o diagnóstico de saúde sem expor segredos nem carregar o modelo."""

    def __init__(
        self,
        ai_service: AIService,
        anomaly_service: AnomalyService,
        min_free_ram_gb: float = HEALTH_MIN_FREE_RAM_GB,
        db_timeout_seconds: float = HEALTH_DB_TIMEOUT_SECONDS,
    ):
        self.ai_service = ai_service
        self.anomaly_service = anomaly_service
        self.min_free_ram_gb = min_free_ram_gb
        self.db_timeout_seconds = db_timeout_seconds

    def get_memory_status(self) -> dict[str, Any]:
        """Memória RAM livre (disponível para novos processos) do host e consumo da API."""
        if psutil is None:
            return {"status": "unavailable", "message": "Pacote 'psutil' não instalado."}
        mem = psutil.virtual_memory()
        free_gb = mem.available / _GB
        return {
            "status": "ok" if free_gb >= self.min_free_ram_gb else "low",
            "free_gb": round(free_gb, 2),
            "total_gb": round(mem.total / _GB, 2),
            "used_percent": round(mem.percent, 1),
            "min_free_gb": self.min_free_ram_gb,
            "process_rss_mb": round(psutil.Process().memory_info().rss / (1024 * 1024), 1),
        }

    async def get_database_status(self) -> dict[str, Any]:
        """Conectividade com o banco, com timeout para o healthcheck nunca travar."""
        try:
            raw = await asyncio.wait_for(
                self.anomaly_service.check_health_async(),
                timeout=self.db_timeout_seconds,
            )
        except asyncio.TimeoutError:
            return {"status": "timeout", "timeout_seconds": self.db_timeout_seconds}
        except Exception as exc:  # noqa: BLE001 - healthcheck não pode propagar falhas
            logger.warning("Falha ao verificar o banco no healthcheck: %s", exc)
            return {"status": "error"}

        # Apenas estados: mensagens/hosts do banco não devem vazar numa rota pública.
        return {
            "status": raw.get("status", "unknown"),
            "postgres_direct": raw.get("postgres_direct", {}).get("status", "unknown"),
            "supabase_api": raw.get("supabase_api", {}).get("status", "unknown"),
        }

    async def get_status(self) -> tuple[dict[str, Any], int]:
        """Retorna (payload, http_status).

        - ``ok`` (200): modelo disponível, RAM suficiente e banco conectado.
        - ``degraded`` (200): API opera, porém com RAM baixa ou banco indisponível.
        - ``unhealthy`` (503): pesos do modelo ausentes; a API não consegue inferir.
        """
        model = self.ai_service.get_model_status()
        memory = self.get_memory_status()
        database = await self.get_database_status()

        if model["status"] == "missing":
            overall = "unhealthy"
        elif database["status"] != "connected" or memory["status"] == "low":
            overall = "degraded"
        else:
            overall = "ok"

        payload = {
            "status": overall,
            "api": "online",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime_seconds": round(time.monotonic() - _STARTED_AT),
            "model": model,
            "memory": memory,
            "database": database,
        }
        return payload, (503 if overall == "unhealthy" else 200)
