"""Serviço assíncrono para manipulação e consulta do histórico de análises (tabela 'analyses')."""

import asyncio
import hashlib
import logging
import os
from pathlib import Path
from typing import Any, List, Optional

from database import (
    TALHOES_METADATA,
    delete_analysis,
    get_all_analyses,
    get_analyses_page,
    get_talhoes_estatisticas,
    insert_analysis,
    normalize_talhao_codigo,
    parse_coordinate_safe,
    parse_float_safe,
    resolve_cultivar,
)

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")

logger = logging.getLogger("sugarvision-history")


class HistoryService:
    """Microserviço responsável por operações na tabela 'analyses' do banco de dados."""

    async def get_all_analyses_async(self) -> List[dict[str, Any]]:
        """Busca todas as análises registradas no histórico de forma assíncrona."""
        return await asyncio.to_thread(get_all_analyses)

    async def get_analyses_page_async(self, page: int, page_size: int) -> tuple[List[dict[str, Any]], int]:
        """Busca uma página do histórico (mais recentes primeiro) e o total de registros."""
        return await asyncio.to_thread(get_analyses_page, page_size, (page - 1) * page_size)

    async def get_talhoes_estatisticas_async(self) -> dict[str, Any]:
        """Calcula estatísticas e médias consolidadas agrupadas por talhão de forma assíncrona."""
        return await asyncio.to_thread(get_talhoes_estatisticas)

    async def create_analysis_async(self, data: dict[str, Any]) -> dict[str, Any]:
        """Salva uma nova análise no histórico de forma assíncrona."""
        return await asyncio.to_thread(insert_analysis, data)

    async def delete_analysis_async(self, analysis_id: str) -> bool:
        """Remove uma análise do histórico no banco de dados de forma assíncrona."""
        return await asyncio.to_thread(delete_analysis, analysis_id)

    async def record_inference_async(
        self,
        filename: str,
        detections: List[dict[str, Any]],
        summary: dict[str, Any],
        image_id: Optional[str] = None,
        image_url: Optional[str] = None,
        file_size_bytes: int = 0,
        talhao_nome: Optional[str] = None,
        talhao_codigo: Optional[str] = None,
        cultivar: Optional[str] = None,
        latitude: Any = None,
        longitude: Any = None,
        inference_time_ms: Any = None,
        use_gps_fallback: bool = False,
    ) -> dict[str, Any]:
        """Calcula métricas a partir do resultado da inferência YOLO e persiste no histórico com geolocalização."""
        if file_size_bytes > 0:
            if file_size_bytes < 1024 * 1024:
                tam_str = f"{file_size_bytes / 1024:.1f} KB"
            else:
                tam_str = f"{file_size_bytes / (1024 * 1024):.1f} MB"
        else:
            tam_str = "15.0 MB"

        ext = Path(filename).suffix.replace(".", "").upper() or "JPG"
        if ext not in ["JPG", "PNG", "JPEG"]:
            ext = "JPG"
        elif ext == "JPEG":
            ext = "JPG"

        wheat_detections = [
            d for d in detections
            if d.get("type") != "cana_de_acucar" and d.get("class_name") != "cana_de_acucar"
        ]
        wheat_count = (
            len(wheat_detections)
            if wheat_detections
            else int(
                parse_float_safe(
                    summary.get("total_cabecas_trigo")
                    if summary.get("total_cabecas_trigo") is not None
                    else (
                        summary.get("total_espigas")
                        if summary.get("total_espigas") is not None
                        else summary.get("total_ervas_daninhas", 0)
                    ),
                    default=0.0,
                )
                or 0
            )
        )

        area_amostra = parse_float_safe(summary.get("area_enquadramento_m2"), default=1.0) or 1.0
        if area_amostra <= 0:
            area_amostra = 1.0

        densidade_estimada = parse_float_safe(summary.get("densidade_estimada"), default=None)
        if densidade_estimada is None:
            densidade_estimada = round(wheat_count / area_amostra, 2)

        if wheat_count == 0:
            area_infestada = 0.0
            percentual = 0.0
            status_analise = "Concluído"
        else:
            area_infestada = round(min(area_amostra * 0.8, 0.03 * wheat_count), 2)
            percentual = round((area_infestada / area_amostra) * 100, 1)
            status_analise = "Atenção" if wheat_count < 20 else "Concluído"

        clean_display_name = filename
        if "_" in filename and len(filename.split("_")[0]) == 8:
            clean_display_name = filename.split("_", 1)[1]

        # Normaliza código do talhão e cultivar de trigo
        resolved_talhao_codigo = normalize_talhao_codigo(
            talhao_codigo or summary.get("talhao_codigo"),
            None,
            talhao_nome,
        )
        talhao_meta = TALHOES_METADATA.get(resolved_talhao_codigo, TALHOES_METADATA["EXP-01"])
        resolved_cultivar = resolve_cultivar(
            cultivar or summary.get("cultivar"),
            None,
            resolved_talhao_codigo,
        )
        resolved_talhao_nome = talhao_nome or talhao_meta["talhao_nome"]

        # Resolução e sanitização de coordenadas GPS (parâmetro -> summary -> fallback do talhão)
        raw_lat = latitude if latitude is not None else summary.get("latitude")
        raw_lng = longitude if longitude is not None else summary.get("longitude")
        final_lat = parse_coordinate_safe(raw_lat, is_latitude=True)
        final_lng = parse_coordinate_safe(raw_lng, is_latitude=False)

        if final_lat is None or final_lng is None:
            if use_gps_fallback:
                seed_val = int(hashlib.md5(filename.encode()).hexdigest()[:6], 16)
                offset_lat = ((seed_val % 1000) / 1000.0 - 0.5) * 0.0025
                offset_lng = (((seed_val // 1000) % 1000) / 1000.0 - 0.5) * 0.0035
                base_lat = talhao_meta.get("default_lat", -28.2178)
                base_lng = talhao_meta.get("default_lon", -52.4075)
                final_lat = round(base_lat + offset_lat, 6)
                final_lng = round(base_lng + offset_lng, 6)
            else:
                final_lat = None
                final_lng = None

        resolved_inf_ms = parse_float_safe(
            inference_time_ms if inference_time_ms is not None else summary.get("inference_time_ms"),
            default=0.0,
        ) or 0.0

        enriched_summary = dict(summary)
        enriched_summary["total_espigas"] = wheat_count
        enriched_summary["total_cabecas_trigo"] = wheat_count
        enriched_summary["densidade_estimada"] = densidade_estimada
        enriched_summary["inference_time_ms"] = resolved_inf_ms
        enriched_summary["talhao_codigo"] = resolved_talhao_codigo
        enriched_summary["cultivar"] = resolved_cultivar
        enriched_summary["latitude"] = final_lat
        enriched_summary["longitude"] = final_lng

        analysis_payload = {
            "image_id": image_id,
            "nome_imagem": clean_display_name,
            "image_url": image_url or f"{BASE_URL}/temp_images/{filename}",
            "tamanho_arquivo": tam_str,
            "formato": ext,
            "talhao_id": talhao_meta["talhao_id"],
            "talhao_codigo": resolved_talhao_codigo,
            "talhao_nome": resolved_talhao_nome,
            "cidade": talhao_meta["cidade"],
            "variedade": resolved_cultivar,
            "cultivar": resolved_cultivar,
            "area_amostra_m2": area_amostra,
            "area_infestacao_m2": area_infestada,
            "percentual_infestacao": percentual,
            "focos_detectados": wheat_count,
            "total_espigas": wheat_count,
            "densidade_estimada": densidade_estimada,
            "inference_time_ms": resolved_inf_ms,
            "status": status_analise,
            "latitude": final_lat,
            "longitude": final_lng,
            "detections": detections,
            "summary": enriched_summary,
        }

        return await self.create_analysis_async(analysis_payload)
