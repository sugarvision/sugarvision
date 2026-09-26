"""Serviço assíncrono para manipulação e consulta do histórico de análises (tabela 'analyses')."""

import asyncio
import logging
from pathlib import Path
from typing import Any, List, Optional

from database import delete_analysis, get_all_analyses, insert_analysis

logger = logging.getLogger("sugarvision-history")


class HistoryService:
    """Microserviço responsável por operações na tabela 'analyses' do banco de dados."""

    async def get_all_analyses_async(self) -> List[dict[str, Any]]:
        """Busca todas as análises registradas no histórico de forma assíncrona."""
        return await asyncio.to_thread(get_all_analyses)

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
    ) -> dict[str, Any]:
        """Calcula métricas a partir do resultado da inferência YOLO e persiste no histórico."""
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

        weed_detections = [
            d for d in detections 
            if d.get("type") != "cana_de_acucar" and d.get("class_name") != "cana_de_acucar"
        ]
        weed_count = len(weed_detections) if weed_detections else int(summary.get("total_ervas_daninhas", 0))

        area_amostra = 2.5
        if weed_count == 0:
            area_infestada = 0.0
            percentual = 0.0
            status_analise = "Concluído"
        else:
            area_infestada = round(min(area_amostra * 0.8, 0.12 * weed_count), 2)
            percentual = round((area_infestada / area_amostra) * 100, 1)
            status_analise = "Atenção" if percentual > 20 else "Concluído"

        clean_display_name = filename
        if "_" in filename and len(filename.split("_")[0]) == 8:
            clean_display_name = filename.split("_", 1)[1]

        analysis_payload = {
            "image_id": image_id,
            "nome_imagem": clean_display_name,
            "image_url": image_url or f"http://127.0.0.1:8000/temp_images/{filename}",
            "tamanho_arquivo": tam_str,
            "formato": ext,
            "talhao_id": "talhao-01",
            "talhao_nome": talhao_nome or f"Amostra {clean_display_name.rsplit('.', 1)[0]}",
            "cidade": "Rio Claro - SP",
            "variedade": "CTC-9001 (Plena Safra)",
            "area_amostra_m2": area_amostra,
            "area_infestacao_m2": area_infestada,
            "percentual_infestacao": percentual,
            "focos_detectados": weed_count,
            "status": status_analise,
            "detections": detections,
            "summary": summary,
        }

        return await self.create_analysis_async(analysis_payload)
