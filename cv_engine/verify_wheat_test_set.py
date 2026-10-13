"""Script de Verificação e Validação do Benchmark de Trigo - Sprint 6.

Verifica:
1. Desativação do modelo legado de cana (cv_engine/best.pt -> best_legado_cana.pt.bak).
2. Carregamento do modelo oficial (backend/best.pt).
3. Integridade do conjunto cv_engine/samples/wheat_test_set/ (imagens e labels 1:1).
4. Normalização das anotações YOLO (classe única 0, coordenadas no intervalo [0, 1]).
5. Configuração do cv_engine/samples/data.yaml.
6. Inferência do modelo oficial nas amostras curadas com métricas de confiança e contagem.
"""

from pathlib import Path
import unittest
import yaml
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent.parent
CV_ENGINE_DIR = BASE_DIR / "cv_engine"
SAMPLES_DIR = CV_ENGINE_DIR / "samples"
TEST_SET_DIR = SAMPLES_DIR / "wheat_test_set"
IMAGES_DIR = TEST_SET_DIR / "images"
LABELS_DIR = TEST_SET_DIR / "labels"
DATA_YAML_PATH = SAMPLES_DIR / "data.yaml"
BACKEND_MODEL_PATH = BASE_DIR / "backend" / "best.pt"
LEGACY_MODEL_PATH = CV_ENGINE_DIR / "best.pt"
BACKUP_MODEL_PATH = CV_ENGINE_DIR / "best_legado_cana.pt.bak"


class TestWheatSprint6CuratedSet(unittest.TestCase):
    """Bateria de testes e conformidade para a Sprint 6."""

    def test_01_legacy_model_renamed_safely(self):
        """Verifica se o modelo legado de cana foi desativado e arquivado como .bak."""
        self.assertFalse(
            LEGACY_MODEL_PATH.exists(),
            "O arquivo conflitante 'cv_engine/best.pt' ainda existe! Deve ser renomeado para .bak.",
        )
        self.assertTrue(
            BACKUP_MODEL_PATH.exists(),
            "O arquivo de backup 'cv_engine/best_legado_cana.pt.bak' não foi encontrado.",
        )
        self.assertGreater(
            BACKUP_MODEL_PATH.stat().st_size,
            4 * 1024 * 1024,
            "O backup deve ter ~4.6 MB.",
        )

    def test_02_backend_model_is_official(self):
        """Valida que backend/best.pt é o modelo oficial com classe 'wheat' (136 MB)."""
        self.assertTrue(BACKEND_MODEL_PATH.exists(), "Modelo backend/best.pt não encontrado!")
        self.assertGreater(
            BACKEND_MODEL_PATH.stat().st_size,
            100 * 1024 * 1024,
            "O modelo oficial backend/best.pt deve ter mais de 100 MB (YOLOv8x).",
        )
        model = YOLO(str(BACKEND_MODEL_PATH))
        self.assertEqual(model.names[0], "wheat")

    def test_03_samples_directories_exist(self):
        """Verifica se a hierarquia canônica de diretórios de teste foi criada."""
        self.assertTrue(IMAGES_DIR.exists(), f"Diretório {IMAGES_DIR} não existe!")
        self.assertTrue(LABELS_DIR.exists(), f"Diretório {LABELS_DIR} não existe!")
        self.assertTrue(DATA_YAML_PATH.exists(), f"Arquivo {DATA_YAML_PATH} não existe!")

    def test_04_images_and_labels_parity(self):
        """Garante paridade 1:1 entre imagens e anotações .txt do conjunto curado."""
        images = list(IMAGES_DIR.glob("*.jpg")) + list(IMAGES_DIR.glob("*.png"))
        labels = list(LABELS_DIR.glob("*.txt"))

        self.assertEqual(len(images), 20, f"Esperado 20 imagens, encontrado {len(images)}")
        self.assertEqual(len(labels), 20, f"Esperado 20 arquivos de anotação, encontrado {len(labels)}")

        image_stems = {img.stem for img in images}
        label_stems = {lbl.stem for lbl in labels}
        self.assertEqual(image_stems, label_stems, "Inconsistência entre nomes de imagens e labels!")

    def test_05_labels_normalized_to_class_zero(self):
        """Verifica se todas as bounding boxes têm classe 0 e coordenadas normalizadas."""
        labels = list(LABELS_DIR.glob("*.txt"))
        total_boxes = 0

        for lbl in labels:
            with open(lbl, "r", encoding="utf-8") as f:
                lines = [line.strip().split() for line in f if line.strip()]

            self.assertGreater(len(lines), 0, f"Arquivo {lbl.name} está vazio!")
            for idx, parts in enumerate(lines):
                total_boxes += 1
                cls_id = int(parts[0])
                self.assertEqual(
                    cls_id, 0, f"Classe inválida {cls_id} em {lbl.name} linha {idx+1}. Deve ser 0 (wheat)!"
                )
                coords = [float(v) for v in parts[1:]]
                self.assertEqual(len(coords), 4, f"Bounding box incompleto em {lbl.name} linha {idx+1}")
                xc, yc, w, h = coords
                self.assertTrue(0.0 <= xc <= 1.0, f"Coordenada xc fora do intervalo [0, 1] em {lbl.name}")
                self.assertTrue(0.0 <= yc <= 1.0, f"Coordenada yc fora do intervalo [0, 1] em {lbl.name}")
                self.assertTrue(0.0 < w <= 1.0, f"Largura w fora do intervalo (0, 1] em {lbl.name}")
                self.assertTrue(0.0 < h <= 1.0, f"Altura h fora do intervalo (0, 1] em {lbl.name}")

        self.assertGreaterEqual(total_boxes, 1000, "O conjunto deve ter pelo menos 1000 espigas de referência.")

    def test_06_data_yaml_structure(self):
        """Verifica a integridade da especificação do arquivo data.yaml."""
        with open(DATA_YAML_PATH, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)

        self.assertEqual(cfg.get("nc"), 1, "nc deve ser 1 (classe única)")
        self.assertIn(0, cfg.get("names", {}))
        self.assertEqual(cfg["names"][0], "wheat")
        self.assertIn("path", cfg)

    def test_07_inference_on_curated_samples(self):
        """Executa inferência de amostra com backend/best.pt nas imagens curadas."""
        model = YOLO(str(BACKEND_MODEL_PATH))
        sample_img = next(IMAGES_DIR.glob("*.jpg"))
        preds = model.predict(source=str(sample_img), conf=0.40, verbose=False)

        self.assertGreater(len(preds), 0)
        boxes = preds[0].boxes
        self.assertGreater(len(boxes), 0, f"Modelo não detectou nenhuma espiga na amostra {sample_img.name}")
        for b in boxes:
            self.assertEqual(int(b.cls[0].item()), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
