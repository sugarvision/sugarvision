"""Testes unitários e de integração para o cv_engine/analyzer.py com foco em Cabeças de Trigo."""

import json
from pathlib import Path
import tempfile
import unittest

from cv_engine.analyzer import SugarVisionAnalyzer, analyze_wheat_image


class TestSugarVisionAnalyzer(unittest.TestCase):
    """Bateria de testes para o motor de visão computacional SugarVision."""

    def test_analyzer_initialization_with_best_model(self):
        """Verifica se o analisador carrega o best.pt com a classe correta."""
        analyzer = SugarVisionAnalyzer(conf_threshold=0.25)
        self.assertIsNotNone(analyzer.model)
        self.assertEqual(analyzer.conf_threshold, 0.25)
        # Modelo de trigo é single-class — só deve existir a classe 0 (wheat)
        classes = analyzer.model.names
        self.assertEqual(len(classes), 1)
        self.assertIn(classes[0].lower(), analyzer.EXPECTED_CLASS_NAMES)

    def test_load_existing_image(self):
        """Verifica o carregamento de imagens locais (dimensões não fixas)."""
        analyzer = SugarVisionAnalyzer()
        img, (w, h), filename = analyzer.load_image("cv_engine/trigo_teste.png")
        self.assertIsNotNone(img)
        self.assertGreater(w, 0)
        self.assertGreater(h, 0)
        self.assertEqual(filename, "trigo_teste.png")

    def test_missing_image_raises_error(self):
        """Garante que imagem inexistente lance FileNotFoundError."""
        analyzer = SugarVisionAnalyzer()
        with self.assertRaises(FileNotFoundError):
            analyzer.load_image("cv_engine/imagem_inexistente.png")

    def test_pixel_to_gps_conversion(self):
        """Verifica a conversão matemática de pixels para coordenadas GPS."""
        analyzer = SugarVisionAnalyzer()
        pixels = [(0.0, 0.0), (512.0, 682.0), (1024.0, 1365.0)]
        gps_coords = analyzer._convert_pixels_to_gps(pixels, 1024, 1365)

        self.assertEqual(len(gps_coords), 3)
        for pt in gps_coords:
            self.assertEqual(len(pt), 2)
            lat, lng = pt[0], pt[1]
            self.assertTrue(-23.0 < lat < -22.0)
            self.assertTrue(-48.0 < lng < -47.0)

    def test_missing_model_raises_error(self):
        """Garante que a ausência de best.pt lance FileNotFoundError explícito
        em vez de cair silenciosamente para um modelo genérico (yolov8n.pt)."""
        with self.assertRaises(FileNotFoundError):
            SugarVisionAnalyzer(model_path="caminho/que/nao/existe.pt")

    def test_classify_detection_type_known_class(self):
        """Classe esperada ('wheat') deve ser mapeada para wheat_head."""
        analyzer = SugarVisionAnalyzer()
        det_type, display_name = analyzer._classify_detection_type("wheat")
        self.assertEqual(det_type, "wheat_head")
        self.assertEqual(display_name, "Cabeça de Trigo")

    def test_classify_detection_type_unexpected_class_does_not_crash(self):
        """Classe inesperada deve logar alerta mas não lançar exceção nem travar o pipeline."""
        analyzer = SugarVisionAnalyzer()
        det_type, _ = analyzer._classify_detection_type("sugarcane")
        # Não deve ser silenciosamente aceito como wheat_head sem alerta — mas também
        # não deve quebrar a execução. Mantém o pipeline vivo com o rótulo bruto.
        self.assertEqual(det_type, "wheat_head")

    def test_wheat_detection_and_json_structure(self):
        """Executa a inferência e valida a estrutura do JSON de saída para cabeças de trigo."""
        analyzer = SugarVisionAnalyzer(conf_threshold=0.25)
        resultado = analyzer.detect("cv_engine/trigo_teste.png")

        self.assertEqual(resultado["status"], "success")
        self.assertIn("timestamp", resultado)
        self.assertIn("image_metadata", resultado)
        self.assertIn("summary", resultado)
        self.assertIn("deteccoes", resultado)

        # O modelo best.pt deve detectar cabeças de trigo nesta imagem
        self.assertGreater(resultado["summary"]["total_cabecas_trigo"], 0)
        self.assertGreaterEqual(resultado["summary"]["confianca_media"], 0.0)
        self.assertLessEqual(resultado["summary"]["confianca_media"], 1.0)

        # Valida estrutura das detecções individuais
        for item in resultado["deteccoes"]:
            self.assertIn("id", item)
            self.assertEqual(item["type"], "wheat_head")
            self.assertIn(item["severity"], ["baixa", "media", "alta"])
            self.assertIn("coordinates", item)
            self.assertGreaterEqual(len(item["coordinates"]), 3)
            self.assertIn("customAreaM2", item)
            self.assertGreaterEqual(item["customAreaM2"], 0)

    def test_draw_and_export(self):
        """Verifica se a imagem anotada e o JSON são exportados com integridade."""
        with tempfile.TemporaryDirectory() as tmpdir:
            json_path = Path(tmpdir) / "teste_saida.json"
            img_path = Path(tmpdir) / "teste_anotado.jpg"

            resultado = analyze_wheat_image(
                image_path="cv_engine/trigo_teste.png",
                output_json_path=json_path,
                output_annotated_path=img_path,
                conf_threshold=0.25,
            )

            self.assertTrue(json_path.exists())
            self.assertTrue(img_path.exists())

            with open(json_path, "r", encoding="utf-8") as f:
                carregado = json.load(f)

            self.assertEqual(carregado["status"], "success")
            self.assertGreater(carregado["summary"]["total_cabecas_trigo"], 0)


if __name__ == "__main__":
    unittest.main()