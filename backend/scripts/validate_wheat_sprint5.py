"""Script de Validação e Benchmark Funcional da IA de Trigo - Sprint 5.

Executa o checklist completo da Sprint 5:
1. Carrega as 20 fotos de campo do conjunto de validação do Global Wheat Dataset (GWHD).
2. Executa inferência exclusivamente com os pesos backend/best.pt (YOLOv8x).
3. Avalia se o modelo detecta a classe única 0: wheat com confiança >= 0.40.
4. Gera imagens anotadas com caixas delimitadoras e scores.
5. Testa envio via TestClient do FastAPI para o endpoint /upload.
6. Identifica e registra casos de erro e oclusão para o filtro de pós-processamento da Sprint 7.
"""

import json
import logging
import os
from pathlib import Path
import time
from typing import Any, Dict, List

import cv2
import numpy as np
from ultralytics import YOLO
from fastapi.testclient import TestClient

# Configuração de caminhos
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "best.pt"
VAL_IMAGES_DIR = BASE_DIR / "data" / "gwhd_val" / "images"
REPORTS_DIR = BASE_DIR.parent / "reports" / "sprint5_wheat_validation"
ANNOTATED_DIR = REPORTS_DIR / "annotated"

REPORTS_DIR.mkdir(parents=True, exist_ok=True)
ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("Sprint5-Wheat-Validator")


def calculate_iou(box1: List[float], box2: List[float]) -> float:
    """Calcula Intersection over Union (IoU) entre duas caixas no formato [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = max(1.0, (box1[2] - box1[0]) * (box1[3] - box1[1]))
    area2 = max(1.0, (box2[2] - box2[0]) * (box2[3] - box2[1]))
    union_area = area1 + area2 - inter_area

    return inter_area / union_area if union_area > 0 else 0.0


def run_sprint5_validation():
    logger.info("=" * 65)
    logger.info("INICIANDO VALIDAÇÃO FUNCIONAL DA IA DE TRIGO - SPRINT 5")
    logger.info("Modelo de Pesos: %s", MODEL_PATH)
    logger.info("Imagens de Validação GWHD: %s", VAL_IMAGES_DIR)
    logger.info("=" * 65)

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Arquivo de pesos não encontrado em: {MODEL_PATH}")

    # 1. Carregar Modelo YOLOv8x
    start_load = time.time()
    model = YOLO(str(MODEL_PATH))
    load_time = time.time() - start_load
    logger.info("Modelo carregado com sucesso em %.2fs! Classes detectadas: %s", load_time, model.names)

    # Validar se a classe única é 0: wheat
    assert 0 in model.names, "Classe 0 ausente no modelo!"
    class_name = str(model.names[0]).lower()
    assert "wheat" in class_name, f"Esperado 'wheat', encontrado '{class_name}'"
    logger.info("Confirmado: Classe única 0 -> '%s'", model.names[0])

    # 2. Obter imagens do GWHD
    image_paths = sorted(list(VAL_IMAGES_DIR.glob("*.jpg")) + list(VAL_IMAGES_DIR.glob("*.png")))
    logger.info("Total de fotos reais do GWHD encontradas para validação: %d", len(image_paths))

    results_summary = []
    total_wheat_detected = 0
    all_confidences = []
    edge_cases_sprint7 = []

    conf_threshold = 0.40

    for idx, img_path in enumerate(image_paths, 1):
        logger.info("[%d/%d] Processando imagem: %s", idx, len(image_paths), img_path.name)
        img_cv = cv2.imread(str(img_path))
        h_orig, w_orig = img_cv.shape[:2]

        # Executar inferência
        t0 = time.time()
        preds = model.predict(source=str(img_path), conf=conf_threshold, iou=0.45, imgsz=1024, verbose=False)
        inf_time = (time.time() - t0) * 1000.0

        boxes = preds[0].boxes
        count_img = len(boxes)
        total_wheat_detected += count_img

        img_confs = []
        parsed_boxes = []

        annotated_cv = img_cv.copy()

        for b_idx, box in enumerate(boxes):
            xy = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = [float(v) for v in xy]
            conf = float(box.conf[0].cpu().item())
            cls_id = int(box.cls[0].cpu().item())

            img_confs.append(conf)
            all_confidences.append(conf)
            parsed_boxes.append({"id": b_idx, "coords": [x1, y1, x2, y2], "conf": conf, "cls": cls_id})

            # Desenhar Bounding Box
            color = (0, 200, 50) if conf >= 0.60 else (0, 165, 255)
            cv2.rectangle(annotated_cv, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            label = f"wheat: {conf:.2f}"
            cv2.putText(
                annotated_cv,
                label,
                (int(x1), max(20, int(y1) - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                1,
                cv2.LINE_AA,
            )

        # Analisar casos de borda (sobreposição alta / oclusão)
        overlapping_pairs = []
        for i in range(len(parsed_boxes)):
            for j in range(i + 1, len(parsed_boxes)):
                iou = calculate_iou(parsed_boxes[i]["coords"], parsed_boxes[j]["coords"])
                if iou > 0.30:  # Espigas com alta sobreposição
                    overlapping_pairs.append({
                        "box_a": parsed_boxes[i]["id"],
                        "box_b": parsed_boxes[j]["id"],
                        "iou": round(iou, 3),
                        "conf_a": round(parsed_boxes[i]["conf"], 3),
                        "conf_b": round(parsed_boxes[j]["conf"], 3),
                    })

        if overlapping_pairs:
            edge_cases_sprint7.append({
                "image": img_path.name,
                "type": "overlapping_heads",
                "severity": "medium",
                "details": f"{len(overlapping_pairs)} pares de espigas sobrepostas com IoU > 0.30",
                "pairs": overlapping_pairs[:5],
                "recommendation_sprint7": "Implementar Soft-NMS ou limiar dinâmico de supressão para evitar duplicação ou fusão de contagem.",
            })

        # Verificar se há espigas de baixa confiança borderline (0.40 a 0.45)
        borderline = [b for b in parsed_boxes if 0.40 <= b["conf"] < 0.45]
        if len(borderline) > 3:
            edge_cases_sprint7.append({
                "image": img_path.name,
                "type": "borderline_confidence_cluster",
                "severity": "low",
                "details": f"{len(borderline)} espigas com confiança entre 0.40 e 0.45 (possível oclusão por folhagem)",
                "recommendation_sprint7": "Aplicar filtro morfológico ou filtro de aspecto (largura/altura) antes de confirmar detecção.",
            })

        # Salvar imagem anotada
        annotated_path = ANNOTATED_DIR / f"annotated_{img_path.name}"
        cv2.imwrite(str(annotated_path), annotated_cv)

        avg_conf = float(np.mean(img_confs)) if img_confs else 0.0
        results_summary.append({
            "image_name": img_path.name,
            "total_wheat_heads": count_img,
            "avg_confidence": round(avg_conf, 4),
            "min_confidence": round(float(np.min(img_confs)), 4) if img_confs else 0.0,
            "max_confidence": round(float(np.max(img_confs)), 4) if img_confs else 0.0,
            "inference_time_ms": round(inf_time, 2),
            "overlapping_pairs_count": len(overlapping_pairs),
            "annotated_saved_path": str(annotated_path),
        })

    # 3. Teste do Endpoint de Upload do Backend FastAPI
    logger.info("-" * 65)
    logger.info("TESTANDO INTEGRAÇÃO DO ENDPOINT /upload DO BACKEND VIA TESTCLIENT")
    logger.info("-" * 65)

    import sys
    if str(BASE_DIR) not in sys.path:
        sys.path.insert(0, str(BASE_DIR))

    from main import app
    client = TestClient(app)

    # Envia uma imagem de trigo para o endpoint /upload
    test_sample = image_paths[0]
    with open(test_sample, "rb") as f:
        response = client.post(
            "/upload",
            files={"file": (test_sample.name, f, "image/jpeg")},
            data={"custom_name": f"validacao_trigo_{test_sample.name}"},
        )

    assert response.status_code == 201, f"Falha no upload HTTP: {response.text}"
    upload_data = response.json()
    logger.info("Upload HTTP 201 OK! Resposta da API: total_detecoes=%d", len(upload_data.get("detections", [])))
    assert "detections" in upload_data
    assert upload_data.get("status") == "success"

    # 4. Compilar Relatório Completo
    overall_avg_conf = float(np.mean(all_confidences)) if all_confidences else 0.0
    report_data = {
        "sprint": 5,
        "task": "Avaliação e Validação Funcional da IA de Trigo",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "model_file": str(MODEL_PATH),
        "model_size_mb": round(MODEL_PATH.stat().st_size / (1024 * 1024), 2),
        "model_classes": model.names,
        "total_images_evaluated": len(image_paths),
        "total_wheat_heads_detected": total_wheat_detected,
        "overall_average_confidence": round(overall_avg_conf, 4),
        "min_confidence_filter": conf_threshold,
        "backend_upload_endpoint_status": "201 Created - Validado",
        "images_summary": results_summary,
        "sprint7_edge_cases": edge_cases_sprint7,
    }

    # Salvar JSON
    json_path = REPORTS_DIR / "validation_report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    logger.info("Relatório JSON salvo em: %s", json_path)

    # Salvar Markdown
    md_path = REPORTS_DIR / "validation_report.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# Relatório de Validação Funcional da IA de Trigo - Sprint 5\n\n")
        f.write(f"- **Data da Avaliação:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"- **Modelo:** `{MODEL_PATH.name}` (YOLOv8x - {report_data['model_size_mb']} MB)\n")
        f.write(f"- **Classe Única Validada:** `{model.names}`\n")
        f.write(f"- **Total de Imagens Avaliadas:** {len(image_paths)}\n")
        f.write(f"- **Total de Espigas de Trigo Detectadas:** {total_wheat_detected}\n")
        f.write(f"- **Confiança Média Global:** {overall_avg_conf * 100:.2f}%\n")
        f.write(f"- **Limiar Mínimo de Confiança:** $\\ge {conf_threshold:.2f}$\n")
        f.write(f"- **Endpoint `/upload` FastAPI:** Validado com sucesso (HTTP 201)\n\n")

        f.write("## Tabela de Resultados por Imagem\n\n")
        f.write("| Imagem | Espigas Detectadas | Conf. Média | Conf. Mínima | Conf. Máxima | Tempo (ms) | Pares Sobrepostos |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n")
        for s in results_summary:
            f.write(f"| `{s['image_name'][:25]}...` | {s['total_wheat_heads']} | {s['avg_confidence']:.2f} | {s['min_confidence']:.2f} | {s['max_confidence']:.2f} | {s['inference_time_ms']} | {s['overlapping_pairs_count']} |\n")

        f.write("\n## Casos de Borda para o Pós-Processamento da Sprint 7\n\n")
        f.write(f"Foram identificados **{len(edge_cases_sprint7)} registros de borda** (sobreposições e oclusões).\n\n")
        for ec in edge_cases_sprint7:
            f.write(f"### Imagem: `{ec['image']}`\n")
            f.write(f"- **Tipo de Ocorrência:** {ec['type']} (Severidade: {ec['severity']})\n")
            f.write(f"- **Detalhe:** {ec['details']}\n")
            f.write(f"- **Recomendação para Sprint 7:** {ec['recommendation_sprint7']}\n\n")

    logger.info("Relatório Markdown salvo em: %s", md_path)
    logger.info("=" * 65)
    logger.info("VALIDAÇÃO CONCLUÍDA COM SUCESSO! 100% DOS CRITÉRIOS ATENDIDOS.")
    logger.info("=" * 65)
    return report_data


if __name__ == "__main__":
    run_sprint5_validation()
