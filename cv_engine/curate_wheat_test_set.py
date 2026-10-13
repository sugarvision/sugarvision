"""Script de Curadoria e Estruturação do Conjunto Oficial de Testes de Trigo (Sprint 6).

Seleciona 20 fotos representativas do GWHD 2021 cobrindo:
- Alta Luminosidade & Sol Direto (CIMMYT / Terraref)
- Sombra & Luz Difusa (UQ / Ukyoto)
- Estágio Vegetativo Inicial / Espigas Verdes (Ukyoto / ARC / KSU)
- Maturação Avançada / Douradas & Alta Densidade (NAU / KSU)

Gera:
1. cv_engine/samples/wheat_test_set/images/ (20 imagens)
2. cv_engine/samples/wheat_test_set/labels/ (20 arquivos .txt com classe normalizada 0)
3. cv_engine/samples/data.yaml (manifesto de validação YOLO)
4. cv_engine/samples/curation_manifest.json (metadados detalhados para rastreabilidade)
"""

import json
import logging
from pathlib import Path
import shutil
import cv2
import numpy as np
import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("Curador-Trigo-Sprint6")

BASE_DIR = Path(__file__).resolve().parent.parent
GWHD_DIR = BASE_DIR / "Global Wheat 2021.v1i.yolov8"
GWHD_TEST_IMG = GWHD_DIR / "test" / "images"
GWHD_TEST_LBL = GWHD_DIR / "test" / "labels"

SAMPLES_DIR = BASE_DIR / "cv_engine" / "samples"
TEST_SET_DIR = SAMPLES_DIR / "wheat_test_set"
IMAGES_DIR = TEST_SET_DIR / "images"
LABELS_DIR = TEST_SET_DIR / "labels"


def analyze_image_properties(img_path: Path):
    """Calcula brilho médio e contraste (desvio padrão) da imagem em tons de cinza."""
    img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0, 0.0, (0, 0)
    h, w = img.shape
    mean_val = float(np.mean(img))
    std_val = float(np.std(img))
    return mean_val, std_val, (w, h)


def select_curated_samples():
    """Seleciona 20 amostras estrategicamente balanceadas por condições reais de campo."""
    with open(GWHD_DIR / "data.yaml", "r", encoding="utf-8") as f:
        gwhd_yaml = yaml.safe_load(f)
    domain_names = gwhd_yaml["names"]

    # Definição dos 4 clusters de interesse
    clusters_def = {
        "alta_luminosidade": {
            "domains": ["CIMMYT_1", "CIMMYT_2", "Terraref_1", "Terraref_2"],
            "target": 5,
            "desc": "Sol pleno, solo árido/claro, alto contraste e sombras duras",
        },
        "sombra_luz_difusa": {
            "domains": ["UQ_10", "UQ_11", "UQ_8"],
            "target": 5,
            "desc": "Luz difusa, céu encoberto e iluminação suave de dossel",
        },
        "estagio_vegetativo_verde": {
            "domains": ["Ukyoto_1", "ARC_1"],
            "target": 5,
            "desc": "Espigas verdes e imaturas camufladas na folhagem verde",
        },
        "maturacao_avancada_alta_densidade": {
            "domains": ["NAU_2", "NAU_3", "KSU_3"],
            "target": 5,
            "desc": "Espigas douradas/senescentes, palha seca e alta aglomeração",
        },
    }

    selected = []
    selected_stems = set()

    for cluster_id, config in clusters_def.items():
        candidates = []
        target_domains = config["domains"]
        target_count = config["target"]

        for lbl_path in sorted(GWHD_TEST_LBL.glob("*.txt")):
            stem = lbl_path.stem
            if stem in selected_stems:
                continue

            img_path = GWHD_TEST_IMG / f"{stem}.jpg"
            if not img_path.exists():
                continue

            with open(lbl_path, "r", encoding="utf-8") as f:
                lines = [l.strip().split() for l in f if l.strip()]

            if len(lines) < 6:  # Amostras com pelo menos 6 espigas para teste representativo
                continue

            dom_id = int(lines[0][0])
            dom_name = domain_names[dom_id] if dom_id < len(domain_names) else f"Domain_{dom_id}"

            if dom_name in target_domains:
                mean_b, std_c, (w, h) = analyze_image_properties(img_path)
                candidates.append({
                    "stem": stem,
                    "img_path": img_path,
                    "lbl_path": lbl_path,
                    "cluster": cluster_id,
                    "cluster_desc": config["desc"],
                    "domain": dom_name,
                    "original_class_id": dom_id,
                    "box_count": len(lines),
                    "mean_brightness": mean_b,
                    "contrast_std": std_c,
                    "resolution": f"{w}x{h}",
                })

        # Ordenar para maximizar representatividade do cluster
        if cluster_id == "alta_luminosidade":
            # Priorizar brilho alto e contraste
            candidates.sort(key=lambda x: (x["mean_brightness"] + x["contrast_std"]), reverse=True)
        elif cluster_id == "sombra_luz_difusa":
            # Priorizar contraste moderado/baixo e boa densidade
            candidates.sort(key=lambda x: x["mean_brightness"])
        elif cluster_id == "estagio_vegetativo_verde":
            # Diversidade de espigas verdes
            candidates.sort(key=lambda x: x["box_count"], reverse=True)
        else:  # maturacao_avancada_alta_densidade
            candidates.sort(key=lambda x: x["box_count"], reverse=True)

        chosen_for_cluster = []
        domains_used = set()
        for cand in candidates:
            if len(chosen_for_cluster) >= target_count:
                break
            # Garantir variedade de domínios dentro do cluster se possível
            if cand["domain"] not in domains_used or len(chosen_for_cluster) >= len(target_domains):
                chosen_for_cluster.append(cand)
                domains_used.add(cand["domain"])
                selected_stems.add(cand["stem"])

        # Preencher caso ainda falte
        for cand in candidates:
            if len(chosen_for_cluster) >= target_count:
                break
            if cand["stem"] not in selected_stems:
                chosen_for_cluster.append(cand)
                selected_stems.add(cand["stem"])

        selected.extend(chosen_for_cluster)
        logger.info("Cluster '%s' -> %d amostras selecionadas (Domínios: %s)", cluster_id, len(chosen_for_cluster), list(domains_used))

    return selected


def execute_curation():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    LABELS_DIR.mkdir(parents=True, exist_ok=True)

    samples = select_curated_samples()
    logger.info("Total de amostras curadas: %d", len(samples))

    manifest_data = {
        "dataset_name": "SugarVision Official Wheat Test Set",
        "origin": "Global Wheat Head Detection (GWHD 2021) / David et al.",
        "license": "CC BY 4.0",
        "total_images": len(samples),
        "total_wheat_heads": sum(s["box_count"] for s in samples),
        "samples": [],
    }

    total_boxes = 0

    for idx, item in enumerate(samples, 1):
        target_img_name = f"wheat_test_{idx:02d}_{item['domain']}.jpg"
        target_lbl_name = f"wheat_test_{idx:02d}_{item['domain']}.txt"

        dest_img_path = IMAGES_DIR / target_img_name
        dest_lbl_path = LABELS_DIR / target_lbl_name

        # Copiar imagem
        shutil.copy2(item["img_path"], dest_img_path)

        # Converter e normalizar labels (Classe única 0: wheat)
        converted_boxes = []
        with open(item["lbl_path"], "r", encoding="utf-8") as f_in:
            for line in f_in:
                parts = line.strip().split()
                if not parts:
                    continue
                # Força classe 0 (wheat)
                coords = [float(p) for p in parts[1:]]
                converted_boxes.append(f"0 {' '.join(f'{c:.6f}' for c in coords)}")

        with open(dest_lbl_path, "w", encoding="utf-8") as f_out:
            f_out.write("\n".join(converted_boxes) + "\n")

        total_boxes += len(converted_boxes)

        manifest_data["samples"].append({
            "id": idx,
            "filename": target_img_name,
            "label_file": target_lbl_name,
            "cluster": item["cluster"],
            "cluster_description": item["cluster_desc"],
            "origin_domain": item["domain"],
            "original_file": item["stem"],
            "wheat_heads_count": len(converted_boxes),
            "mean_brightness": round(item["mean_brightness"], 2),
            "contrast_std": round(item["contrast_std"], 2),
            "resolution": item["resolution"],
        })

    # Criar manifesto JSON
    manifest_path = SAMPLES_DIR / "curation_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)
    logger.info("Manifesto de curadoria salvo em: %s", manifest_path)

    # Criar data.yaml oficial
    data_yaml_content = f"""# SugarVision - Benchmark e Conjunto Oficial de Testes de Trigo (Sprint 6)
# Origin: Global Wheat Head Detection (GWHD 2021) - David et al. (CC BY 4.0)

path: wheat_test_set
train: images
val: images
test: images

nc: 1
names:
  0: wheat

metadata:
  total_samples: {len(samples)}
  total_ground_truth_heads: {total_boxes}
  curation_clusters:
    - alta_luminosidade (sol a pino / solo claro / alto contraste)
    - sombra_luz_difusa (luz difusa / céu encoberto)
    - estagio_vegetativo_verde (espigas jovens camufladas na folhagem)
    - maturacao_avancada_alta_densidade (espigas secas / douradas / alta aglomeração)
"""
    data_yaml_path = SAMPLES_DIR / "data.yaml"
    with open(data_yaml_path, "w", encoding="utf-8") as f:
        f.write(data_yaml_content)
    logger.info("Arquivo de configuração data.yaml salvo em: %s", data_yaml_path)

    # Criar README.md na pasta cv_engine/samples/
    readme_content = f"""# Conjunto de Testes Oficial de Trigo — SugarVision (Sprint 6)

Este diretório contém o conjunto de testes oficial curado a partir do **Global Wheat Head Dataset 2021 (GWHD)** para servir de benchmark padrão do modelo de visão computacional.

## Resumo Estatístico
- **Total de Imagens:** {len(samples)}
- **Total de Espigas de Trigo Anotadas:** {total_boxes}
- **Classe Única Validada:** `0: wheat`
- **Modelo Oficial de Produção:** `backend/best.pt` (YOLOv8x - 136 MB)
- **Licença do Dataset:** Creative Commons Attribution 4.0 International (CC BY 4.0)

## Estrutura de Diretórios
```
cv_engine/samples/
├── data.yaml                     # Configuração para ultralytics YOLO
├── curation_manifest.json        # Metadados e telemetria de cada amostra
├── README.md                     # Documentação oficial
└── wheat_test_set/
    ├── images/                   # 20 imagens fotométricas e fenológicas
    └── labels/                   # 20 anotações YOLO (.txt) normalizadas para classe 0
```

## Distribuição dos Clusters de Amostragem

1. **Alta Luminosidade & Sol Direto (5 amostras):** Domínios CIMMYT e Terraref. Condições de radiação solar direta, solo seco e alto contraste com sombras duras.
2. **Sombra & Luz Difusa (5 amostras):** Domínios UQ (University of Queensland). Dias nublados, luz difusa e sombra sob dossel foliar.
3. **Estágio Vegetativo Inicial / Espigas Verdes (5 amostras):** Domínios Ukyoto e ARC. Espigas jovens com matiz verde similar à folhagem, testando capacidade de discriminação morfológica.
4. **Maturação Avançada & Alta Densidade (5 amostras):** Domínios NAU e KSU. Espigas douradas e senescentes em fase pré-colheita com alta densidade e proximidade espacial.

## Referência Científica
David, E., Madec, S., Sadeghi-Tehran, P., et al. (2021). *Global Wheat Head Dataset 2021: more diversity to improve the average domain generalization*. Plant Phenomics.
"""
    readme_path = SAMPLES_DIR / "README.md"
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
    logger.info("README.md documentado em: %s", readme_path)

    print("\n" + "=" * 65)
    print(f"CURADORIA CONCLUÍDA COM SUCESSO!")
    print(f"Imagens Curadas: {len(samples)} fotos em {IMAGES_DIR}")
    print(f"Anotações Normalizadas (Classe 0): {total_boxes} espigas em {LABELS_DIR}")
    print(f"Configuração YOLO: {data_yaml_path}")
    print("=" * 65)


if __name__ == "__main__":
    execute_curation()
