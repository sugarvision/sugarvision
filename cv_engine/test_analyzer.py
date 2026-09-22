"""Testes unitários e de integração para o cv_engine/analyzer.py com foco em Ervas Daninhas."""

import json
from pathlib import Path
import tempfile
import unittest

from cv_engine.analyzer import SugarVisionAnalyzer, analyze_sugarcane_image


class TestSugarVisionAnalyzer(unittest.TestCase):
    """Bateria de testes para o motor de visão computacional SugarVision."""

    def test_analyzer_initialization_with_best_model(self):
        """Verifica se o analisador carrega o best.pt com as classes corretas."""
        analyzer = SugarVisionAnalyzer(conf_threshold=0.25)
        self.assertIsNotNone(analyzer.model)
        self.assertEqual(analyzer.conf_threshold, 0.25)
        # Verifica se as classes do modelo treinado são sugarcane e weed
        classes = analyzer.model.names
        self.assertIn(1, classes)
        self.assertEqual(classes[1], "weed")

    def test_load_existing_image(self):
        """Verifica o carregamento de imagens locais."""
        analyzer = SugarVisionAnalyzer()
        img, (w, h), filename = analyzer.load_image("cv_engine/amostra_erva_daninha.jpg")
        self.assertIsNotNone(img)
        self.assertEqual(w, 1024)
        self.assertEqual(h, 1365)
        self.assertEqual(filename, "amostra_erva_daninha.jpg")

    def test_missing_image_raises_error(self):
        """Garante que imagem inexistente lance FileNotFoundError."""
        analyzer = SugarVisionAnalyzer()
        with self.assertRaises(FileNotFoundError):
            analyzer.load_image("cv_engine/imagem_inexistente.jpg")

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

    def test_weed_detection_and_json_structure(self):
        """Executa a inferência e valida a estrutura do JSON de saída para ervas daninhas."""
        analyzer = SugarVisionAnalyzer(conf_threshold=0.25)
        resultado = analyzer.detect("cv_engine/amostra_erva_daninha.jpg")

        self.assertEqual(resultado["status"], "success")
        self.assertIn("timestamp", resultado)
        self.assertIn("image_metadata", resultado)
        self.assertEqual(resultado["image_metadata"]["width"], 1024)
        self.assertEqual(resultado["image_metadata"]["height"], 1365)
        self.assertIn("summary", resultado)
        self.assertIn("deteccoes", resultado)

        # O modelo best.pt deve detectar focos de ervas daninhas nesta imagem
        self.assertGreater(resultado["summary"]["total_ervas_daninhas"], 0)
        self.assertGreater(resultado["summary"]["taxa_infestacao_percent"], 0)

        # Valida estrutura das detecções individuais
        for item in resultado["deteccoes"]:
            self.assertIn("id", item)
            self.assertIn(item["type"], ["erva_daninha", "cana_de_acucar"])
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

            resultado = analyze_sugarcane_image(
                image_path="cv_engine/amostra_erva_daninha.jpg",
                output_json_path=json_path,
                output_annotated_path=img_path,
                conf_threshold=0.25,
            )

            self.assertTrue(json_path.exists())
            self.assertTrue(img_path.exists())

            with open(json_path, "r", encoding="utf-8") as f:
                carregado = json.load(f)

            self.assertEqual(carregado["status"], "success")
            self.assertGreater(carregado["summary"]["total_ervas_daninhas"], 0)


if __name__ == "__main__":
    unittest.main()
