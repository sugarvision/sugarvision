"""Motor de Visão Computacional para Análise Agrícola - SugarVision.

Carrega o modelo YOLO treinado (Ultralytics) para detecção de cabeças de
trigo (classe única: wheat), extrai caixas delimitadoras e as transforma
em coordenadas reais georreferenciadas formatadas em JSON.
"""

from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
from ultralytics import YOLO

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("SugarVision-Analyzer")


class SugarVisionAnalyzer:
    """Motor de análise com YOLO para detecção de cabeças de trigo.

    Carrega os pesos da rede neural (best.pt treinado no dataset Global
    Wheat Head 2021), executa a inferência sobre fotos de lavoura de
    trigo, extrai caixas e gera coordenadas reais formatadas em JSON.
    """

    DEFAULT_GSD = 0.03  # Ground Sample Distance estimado: 0.03 metros (3 cm) por pixel
    EXPECTED_CLASS_NAMES = {"wheat", "wheat_head", "head"}

    def __init__(
        self,
        model_path: Optional[Union[str, Path]] = None,
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45,
        device: Optional[str] = None,
    ):
        """Inicializa o motor de análise YOLO.

        Args:
            model_path: Caminho para os pesos (.pt). Prioriza 'best.pt' local.
            conf_threshold: Limiar mínimo de confiança para a inferência (0 a 1).
            iou_threshold: Limiar de sobreposição IoU para Non-Maximum Suppression.
            device: Dispositivo de execução ('cpu', 'cuda', etc.). Se None, detecta auto.
        """
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.device = device
        self.model_path = self._resolve_model_path(model_path)

        logger.info("Carregando modelo YOLO a partir de: %s", self.model_path)
        self.model = YOLO(str(self.model_path))
        logger.info("Modelo YOLO inicializado com sucesso! Classes: %s", self.model.names)

    def _resolve_model_path(self, model_path: Optional[Union[str, Path]]) -> Path:
        """Resolve o caminho do modelo, priorizando cv_engine/best.pt.

        Levanta FileNotFoundError explicitamente se nenhum modelo treinado
        for encontrado — em vez de usar silenciosamente um fallback para
        yolov8n.pt (modelo COCO genérico). Um fallback silencioso faria o
        sistema continuar "funcionando" com detecções completamente
        inválidas para o domínio agrícola, sem qualquer sinal de erro.
        """
        base_dir = Path(__file__).resolve().parent

        if model_path:
            p = Path(model_path)
            if p.exists():
                return p
            if (base_dir / model_path).exists():
                return base_dir / model_path
            raise FileNotFoundError(
                f"Modelo especificado explicitamente não encontrado: {model_path}"
            )

        # 1. Verifica best.pt na pasta cv_engine
        custom_best = base_dir / "best.pt"
        if custom_best.exists():
            return custom_best

        # 2. Verifica best.pt na pasta backend
        backend_best = base_dir.parent / "backend" / "best.pt"
        if backend_best.exists():
            return backend_best

        # 3. Nenhum modelo encontrado — falha explícita, nunca silenciosa
        raise FileNotFoundError(
            "Nenhum best.pt encontrado em cv_engine/ ou backend/. "
            "O sistema não pode operar sem o modelo de trigo treinado — "
            "um fallback para um modelo genérico produziria detecções "
            "inválidas sem qualquer aviso. Verifique se o arquivo foi "
            "colocado corretamente (ver T01, checklist de arquivos)."
        )

    def load_image(
        self, image_input: Union[str, Path, np.ndarray]
    ) -> Tuple[np.ndarray, Tuple[int, int], str]:
        """Carrega e valida a imagem para análise.

        Args:
            image_input: Caminho do arquivo ou array OpenCV (np.ndarray).

        Returns:
            Tupla contendo: (imagem_bgr, (largura, altura), nome_do_arquivo)
        """
        if isinstance(image_input, np.ndarray):
            h, w = image_input.shape[:2]
            return image_input, (w, h), "numpy_array"

        img_path = Path(image_input)
        if not img_path.is_absolute():
            if not img_path.exists():
                alt_path = Path(__file__).resolve().parent / img_path
                if alt_path.exists():
                    img_path = alt_path

        if not img_path.exists():
            raise FileNotFoundError(f"Imagem não encontrada: {img_path}")

        image = cv2.imread(str(img_path))
        if image is None:
            raise ValueError(f"Falha ao decodificar a imagem com OpenCV: {img_path}")

        h, w = image.shape[:2]
        return image, (w, h), img_path.name

    def _convert_pixels_to_gps(
        self,
        pixels: List[Tuple[float, float]],
        img_width: int,
        img_height: int,
        geo_reference: Optional[Dict[str, Any]] = None,
    ) -> List[List[float]]:
        """Transforma coordenadas em pixels (x, y) em coordenadas reais [latitude, longitude].

        Se geo_reference contiver 'bounds' ou 'center', realiza a projeção proporcional.
        Caso contrário, utiliza a região padrão de Rio Claro / Piracicaba-SP.
        """
        center_lat = -22.4149
        center_lng = -47.5613
        delta_lat = 0.0030  # ~330 metros
        delta_lng = 0.0030  # ~310 metros

        if geo_reference:
            if "center" in geo_reference:
                center_lat = geo_reference["center"][0]
                center_lng = geo_reference["center"][1]
            if "bounds" in geo_reference:
                b = geo_reference["bounds"]
                min_lat, min_lng, max_lat, max_lng = b[0], b[1], b[2], b[3]
                gps_points = []
                for px, py in pixels:
                    norm_x = px / max(img_width, 1)
                    norm_y = py / max(img_height, 1)
                    lat = max_lat - norm_y * (max_lat - min_lat)
                    lng = min_lng + norm_x * (max_lng - min_lng)
                    gps_points.append([round(lat, 7), round(lng, 7)])
                return gps_points

        min_lat = center_lat - delta_lat / 2
        max_lat = center_lat + delta_lat / 2
        min_lng = center_lng - delta_lng / 2
        max_lng = center_lng + delta_lng / 2

        gps_points = []
        for px, py in pixels:
            norm_x = px / max(img_width, 1)
            norm_y = py / max(img_height, 1)
            lat = max_lat - norm_y * (max_lat - min_lat)
            lng = min_lng + norm_x * (max_lng - min_lng)
            gps_points.append([round(lat, 7), round(lng, 7)])

        return gps_points

    def _classify_detection_type(self, class_name: str) -> Tuple[str, str]:
        """Mapeia a classe do modelo para o tipo semântico e rótulo amigável.

        O modelo de trigo é single-class (apenas 'wheat'). Uma classe
        inesperada é logada como alerta em vez de ser silenciosamente
        tratada como trigo — isso evita contaminar métricas de
        densidade/produtividade com detecções de um modelo errado
        (ex: alguém esqueceu de trocar o best.pt antigo de cana/erva).

        Returns:
            Tupla (tipo_semantico, nome_exibicao)
        """
        c_lower = class_name.lower().strip()
        if c_lower in self.EXPECTED_CLASS_NAMES:
            return "wheat_head", "Cabeça de Trigo"

        logger.warning(
            "Classe inesperada '%s' retornada pelo modelo (esperado: %s). "
            "Verifique se o best.pt carregado é realmente o modelo de trigo.",
            class_name,
            self.EXPECTED_CLASS_NAMES,
        )
        return "wheat_head", class_name.title()

    def _estimate_severity(self, area_m2: float, det_type: str) -> str:
        """Severidade por detecção individual — mantida por compatibilidade.

        Para o domínio de trigo, severidade por detecção isolada não tem
        sentido agronômico (uma cabeça de trigo não é uma ameaça). O
        conceito relevante é densidade de espigas POR ZONA do talhão,
        implementado em T04. Retorna valor neutro até lá para não
        quebrar os contratos de dados existentes no frontend.
        """
        return "baixa"  # TODO(T04): substituir por classificação de zona por densidade

    def detect(
        self,
        image_input: Union[str, Path, np.ndarray],
        geo_reference: Optional[Dict[str, Any]] = None,
        gsd_meters_per_pixel: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Abre a foto, executa a inferência YOLO e extrai caixas em coordenadas reais.

        Args:
            image_input: Caminho da imagem ou matriz de imagem.
            geo_reference: Metadados geográficos opcionais (limites ou centro).
            gsd_meters_per_pixel: Resolução do solo em m/pixel (padrão 0.03 m).

        Returns:
            Dicionário estruturado com as detecções, métricas e coordenadas reais.
        """
        image, (img_width, img_height), filename = self.load_image(image_input)
        gsd = gsd_meters_per_pixel or self.DEFAULT_GSD

        logger.info(
            "Executando inferência na imagem '%s' (%dx%d px) com conf=%.2f...",
            filename,
            img_width,
            img_height,
            self.conf_threshold,
        )

        # Inferência com YOLO
        results = self.model.predict(
            source=image,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            device=self.device,
            verbose=False,
        )

        detections: List[Dict[str, Any]] = []
        result = results[0]

        has_boxes = result.boxes is not None and len(result.boxes) > 0
        has_masks = result.masks is not None and len(result.masks) > 0
        num_detections = len(result.masks) if has_masks else (len(result.boxes) if has_boxes else 0)

        count_wheat = 0

        for idx in range(num_detections):
            if has_boxes:
                box = result.boxes[idx]
                conf = float(box.conf[0].cpu().item())
                cls_id = int(box.cls[0].cpu().item())
                raw_class_name = self.model.names.get(cls_id, f"classe_{cls_id}")

                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].cpu().numpy()]
                w_px = max(x2 - x1, 0.0)
                h_px = max(y2 - y1, 0.0)
            else:
                conf = 1.0
                cls_id = 0
                raw_class_name = "wheat"
                x1, y1, x2, y2 = 0.0, 0.0, 0.0, 0.0
                w_px, h_px = 0.0, 0.0

            det_type, display_name = self._classify_detection_type(raw_class_name)

            count_wheat += 1
            item_id = f"wheat_{count_wheat}"
            item_name = f"{display_name} #{count_wheat}"

            # Extração de polígonos
            if has_masks:
                poly_coords = result.masks.xy[idx]
                polygon_pixels = [(float(pt[0]), float(pt[1])) for pt in poly_coords]
                poly_np = np.array(polygon_pixels, dtype=np.float32)
                area_pixels = float(cv2.contourArea(poly_np.astype(np.int32)))
            else:
                polygon_pixels = [
                    (x1, y1),
                    (x2, y1),
                    (x2, y2),
                    (x1, y2),
                ]
                area_pixels = w_px * h_px

            # Conversão para coordenadas reais [latitude, longitude]
            real_coordinates = self._convert_pixels_to_gps(
                polygon_pixels, img_width, img_height, geo_reference
            )

            area_m2 = area_pixels * (gsd**2)
            severity = self._estimate_severity(area_m2, det_type)

            det_info: Dict[str, Any] = {
                "id": item_id,
                "name": item_name,
                "type": det_type,
                "severity": severity,
                "confidence": round(conf, 4),
                "class_id": cls_id,
                "class_name": raw_class_name,
                "box_pixels": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                    "width": round(w_px, 2),
                    "height": round(h_px, 2),
                },
                "box_normalized": {
                    "x1": round(x1 / max(img_width, 1), 6),
                    "y1": round(y1 / max(img_height, 1), 6),
                    "x2": round(x2 / max(img_width, 1), 6),
                    "y2": round(y2 / max(img_height, 1), 6),
                },
                "polygon_pixels": [[round(p[0], 2), round(p[1], 2)] for p in polygon_pixels],
                "coordinates": real_coordinates,  # Formato Leaflet [[lat, lng], ...]
                "area_pixels": round(area_pixels, 2),
                "customAreaM2": round(area_m2, 2),
            }
            detections.append(det_info)

        total_detections = len(detections)
        confianca_media = (
            round(sum(d["confidence"] for d in detections) / total_detections, 4)
            if total_detections > 0
            else 0.0
        )

        output: Dict[str, Any] = {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "model_used": str(self.model_path),
            "image_metadata": {
                "filename": filename,
                "width": img_width,
                "height": img_height,
                "gsd_meters_per_pixel": gsd,
            },
            "summary": {
                # Escopo do T01: contagem bruta + confiança média.
                # Densidade (T02), produtividade estimada (T03) e zonas
                # de densidade (T04) são adicionadas aqui por outras
                # tasks do backlog — não implementar esses campos agora.
                "total_cabecas_trigo": total_detections,
                "confianca_media": confianca_media,
            },
            "deteccoes": detections,
        }

        return output

    # Alias para compatibilidade com a interface anterior
    def detect_gaps(
        self,
        image_input: Union[str, Path, np.ndarray],
        geo_reference: Optional[Dict[str, Any]] = None,
        gsd_meters_per_pixel: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Alias para detect(...)."""
        return self.detect(
            image_input, geo_reference=geo_reference, gsd_meters_per_pixel=gsd_meters_per_pixel
        )

    def draw_detections(
        self,
        image_input: Union[str, Path, np.ndarray],
        detections_data: Dict[str, Any],
        output_path: Optional[Union[str, Path]] = None,
    ) -> np.ndarray:
        """Gera imagem anotada com caixas e polígonos das cabeças de trigo detectadas."""
        image, _, _ = self.load_image(image_input)
        annotated = image.copy()

        color_map = {
            "wheat_head": (0, 200, 0),  # Verde — cabeça de trigo identificada
        }

        items = detections_data.get("deteccoes", [])

        for item in items:
            color = color_map.get(item.get("type", "wheat_head"), (0, 200, 0))

            poly_pts = np.array(item["polygon_pixels"], dtype=np.int32)

            # Polígono translúcido
            overlay = annotated.copy()
            cv2.fillPoly(overlay, [poly_pts], color)
            cv2.addWeighted(overlay, 0.3, annotated, 0.7, 0, annotated)

            # Borda do polígono
            cv2.polylines(annotated, [poly_pts], isClosed=True, color=color, thickness=2)

            # Rótulo de texto
            box = item["box_pixels"]
            conf = item.get("confidence", 1.0)
            label = f"Trigo #{item['id'].split('_')[-1]} ({conf*100:.0f}%)"
            lx, ly = int(box["x1"]), max(int(box["y1"]) - 6, 14)

            cv2.putText(
                annotated,
                label,
                (lx, ly),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 0, 0),
                2,
                cv2.LINE_AA,
            )
            cv2.putText(
                annotated,
                label,
                (lx, ly),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        if output_path:
            out_p = Path(output_path)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(out_p), annotated)
            logger.info("Imagem anotada salva com sucesso em: %s", out_p.resolve())

        return annotated

    def export_json(
        self,
        analysis_result: Dict[str, Any],
        output_json_path: Optional[Union[str, Path]] = None,
        indent: int = 2,
    ) -> str:
        """Exporta os resultados da análise para JSON estruturado."""
        json_str = json.dumps(analysis_result, indent=indent, ensure_ascii=False)

        if output_json_path:
            p = Path(output_json_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                f.write(json_str)
            logger.info("Resultado JSON exportado com sucesso em: %s", p.resolve())

        return json_str


# Compatibilidade com a nomenclatura anterior
PlantingGapAnalyzer = SugarVisionAnalyzer


def analyze_wheat_image(
    image_path: Union[str, Path],
    model_path: Optional[Union[str, Path]] = None,
    output_json_path: Optional[Union[str, Path]] = None,
    output_annotated_path: Optional[Union[str, Path]] = None,
    conf_threshold: float = 0.25,
) -> Dict[str, Any]:
    """Função ponte para acionamento direto do motor de visão computacional."""
    analyzer = SugarVisionAnalyzer(model_path=model_path, conf_threshold=conf_threshold)
    result = analyzer.detect(image_path)

    if output_annotated_path:
        analyzer.draw_detections(image_path, result, output_path=output_annotated_path)

    if output_json_path:
        analyzer.export_json(result, output_json_path=output_json_path)

    return result


# Alias temporário — manter até todos os chamadores migrarem (ver T01 checklist)
analyze_sugarcane_image = analyze_wheat_image


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="SugarVision - Motor de Análise de Cabeças de Trigo com YOLO"
    )
    parser.add_argument(
        "--image",
        type=str,
        default=None,
        help="Caminho da foto para análise",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Caminho do modelo de pesos (.pt). Padrão: cv_engine/best.pt",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Limiar de confiança para detecção (padrão: 0.25)",
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default="cv_engine/resultado_analise.json",
        help="Caminho para salvar o arquivo JSON gerado",
    )
    parser.add_argument(
        "--output-img",
        type=str,
        default="cv_engine/resultado_anotado.jpg",
        help="Caminho para salvar a foto com detecções desenhadas",
    )

    args = parser.parse_args()

    target_img = args.image
    if not target_img:
        dir_atual = Path(__file__).resolve().parent
        if (dir_atual / "amostra_trigo.jpg").exists():
            target_img = str(dir_atual / "amostra_trigo.jpg")
        else:
            raise FileNotFoundError("Nenhuma imagem encontrada em cv_engine/ para teste.")

    print(f"\n=======================================================")
    print(f"🌾 SugarVision - Motor de Detecção de Cabeças de Trigo")
    print(f"📷 Imagem selecionada: {target_img}")
    print(f"=======================================================\n")

    resultado = analyze_wheat_image(
        image_path=target_img,
        model_path=args.model,
        output_json_path=args.output_json,
        output_annotated_path=args.output_img,
        conf_threshold=args.conf,
    )

    resumo = resultado["summary"]
    print("\n📊 Resumo da Análise:")
    print(f"- Total de Cabeças de Trigo: {resumo['total_cabecas_trigo']}")
    print(f"- Confiança Média:           {resumo['confianca_media']*100:.1f}%")
    print(f"\n📁 Arquivos Gerados:")
    print(f"  ✓ JSON estruturado: {Path(args.output_json).resolve()}")
    print(f"  ✓ Imagem anotada:   {Path(args.output_img).resolve()}\n")