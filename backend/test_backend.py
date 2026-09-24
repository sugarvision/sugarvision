"""Suíte de testes automatizados para validação do backend do SugarVision.

Testa os seguintes cenários:
1. Rota raiz (GET /)
2. Rota de saúde e status do banco (GET /health)
3. Upload de imagem válida PNG (POST /upload)
4. Upload de imagem válida JPEG (POST /upload)
5. Upload de arquivo grande (simulação de 5MB) para validar suporte a arquivos pesados
6. Rejeição de tipos de arquivo não permitidos (.txt, .pdf)
7. Validação de requisição sem arquivo (HTTP 422)
8. Validação física no disco dos arquivos em temp_images/
"""

import io
import asyncio
from pathlib import Path
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import UploadFile

from fastapi.testclient import TestClient

import main
from main import app, TEMP_IMAGES_DIR, MODEL_PATH
from ai_engine import carregar_modelo_yolo, processar_imagem_ia, DEFAULT_MODEL_PATH
from database import get_all_anomalies, FALLBACK_ANOMALIES
from app.core.dependencies import get_ai_service, get_anomaly_service, get_storage_service
from app.services.ai_service import AIService
from app.services.anomaly_service import AnomalyService
from app.services.storage_service import StorageService


class TestSugarVisionBackend(unittest.TestCase):
    """Testes unitários e de integração do backend FastAPI."""

    @classmethod
    def setUpClass(cls):
        """Inicializa o cliente de teste HTTP do FastAPI."""
        cls.client = TestClient(app)
        cls.created_files = []
        # Configura delay para 0 durante a suite geral para execução ultrarrápida
        cls._original_delay = main.AI_DELAY_SECONDS
        main.AI_DELAY_SECONDS = 0.0

    @classmethod
    def tearDownClass(cls):
        """Restaura configurações e limpa arquivos gerados."""
        main.AI_DELAY_SECONDS = cls._original_delay
        for file_path in cls.created_files:
            if file_path.exists():
                file_path.unlink()

    def test_01_read_root(self):
        """Valida se a rota raiz (GET /) responde com status 200 e mensagem esperada."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "servidor online")
        print("  [PASS] 01 - Rota raiz GET / respondeu 200 OK")

    def test_02_health_check(self):
        """Valida se a rota GET /health retorna status da API e do banco."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("api"), "online")
        self.assertIn("database", data)
        print("  [PASS] 02 - Rota GET /health respondeu 200 OK com diagnóstico do banco")

    def test_03_upload_valid_png(self):
        """Valida o envio e armazenamento de uma imagem PNG."""
        # 1x1 pixel PNG válido em bytes
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00"
            b"\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        file_payload = {"file": ("cana_de_acucar.png", io.BytesIO(png_bytes), "image/png")}

        response = self.client.post("/upload", files=file_payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()

        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("original_filename"), "cana_de_acucar.png")
        self.assertEqual(data.get("size_bytes"), len(png_bytes))

        # Verifica persistência real no disco
        saved_path = Path(data.get("saved_path"))
        self.assertTrue(saved_path.exists())
        self.assertEqual(saved_path.stat().st_size, len(png_bytes))
        self.created_files.append(saved_path)
        print(f"  [PASS] 03 - Upload PNG válido aceito e gravado: {saved_path.name}")

    def test_04_upload_valid_jpeg(self):
        """Valida o envio e armazenamento de uma imagem JPEG."""
        # Header básico JPEG (SOI + EOI)
        jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9"
        file_payload = {"file": ("lavoura_teste.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}

        response = self.client.post("/upload", files=file_payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()

        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("original_filename"), "lavoura_teste.jpg")

        saved_path = Path(data.get("saved_path"))
        self.assertTrue(saved_path.exists())
        self.created_files.append(saved_path)
        print(f"  [PASS] 04 - Upload JPEG válido aceito e gravado: {saved_path.name}")

    def test_05_upload_large_file(self):
        """Valida envio de arquivo grande (~5 MB) para verificar streaming e robustez."""
        large_size = 5 * 1024 * 1024  # 5 Megabytes
        large_data = b"X" * large_size
        file_payload = {"file": ("drone_alta_resolucao.png", io.BytesIO(large_data), "image/png")}

        response = self.client.post("/upload", files=file_payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()

        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("size_bytes"), large_size)

        saved_path = Path(data.get("saved_path"))
        self.assertTrue(saved_path.exists())
        self.assertEqual(saved_path.stat().st_size, large_size)
        self.created_files.append(saved_path)
        print(f"  [PASS] 05 - Upload de arquivo grande (5MB) processado com sucesso: {saved_path.name}")

    def test_06_reject_unsupported_extension(self):
        """Valida que arquivos que não sejam imagens são rejeitados com HTTP 400."""
        text_content = b"Conteudo malicioso ou nao suportado"
        file_payload = {"file": ("documento.pdf", io.BytesIO(text_content), "application/pdf")}

        response = self.client.post("/upload", files=file_payload)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("não suportado", data.get("detail", ""))
        print("  [PASS] 06 - Rejeição correta de arquivo com formato inválido (HTTP 400)")

    def test_07_reject_missing_file_payload(self):
        """Valida que requisição sem campo de arquivo é rejeitada com HTTP 422."""
        response = self.client.post("/upload", data={})
        self.assertEqual(response.status_code, 422)
        print("  [PASS] 07 - Rejeição correta de requisição sem arquivo (HTTP 422)")

    def test_08_temp_images_directory_exists(self):
        """Valida se a pasta temp_images/ foi criada e é gravável."""
        self.assertTrue(TEMP_IMAGES_DIR.exists())
        self.assertTrue(TEMP_IMAGES_DIR.is_dir())
        print(f"  [PASS] 08 - Pasta temp_images/ confirmada em: {TEMP_IMAGES_DIR}")

    def test_09_model_file_exists_and_valid(self):
        """Valida se o arquivo do modelo best.pt existe no backend e é um arquivo não vazio (>1MB)."""
        self.assertTrue(MODEL_PATH.exists(), f"Modelo não encontrado em: {MODEL_PATH}")
        self.assertTrue(MODEL_PATH.is_file(), f"Caminho do modelo não é um arquivo: {MODEL_PATH}")
        tamanho = MODEL_PATH.stat().st_size
        self.assertGreater(tamanho, 1024 * 1024, "O modelo best.pt deve ter mais de 1MB")
        print(f"  [PASS] 09 - Modelo best.pt validado no backend ({tamanho} bytes)")

    def test_10_upload_enqueues_background_task(self):
        """Valida se a rota /upload retorna o status de agendamento da IA ('enqueued')."""
        payload = {"file": ("cana_bg_test.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"X" * 32), "image/png")}
        response = self.client.post("/upload", files=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data.get("ai_status"), "enqueued")
        saved_path = Path(data.get("saved_path"))
        self.created_files.append(saved_path)
        print("  [PASS] 10 - Upload responde com 'ai_status': 'enqueued'")

    @patch("main.processar_imagem_ia")
    def test_11_upload_calls_background_task_with_saved_path(self, mock_ai):
        """Valida se a BackgroundTask do FastAPI agenda a função processar_imagem_ia com os parâmetros esperados."""
        payload = {"file": ("drone_teste_bg.jpg", io.BytesIO(b"\xff\xd8\xff\xe0" + b"X" * 32), "image/jpeg")}
        response = self.client.post("/upload", files=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        saved_path = Path(data.get("saved_path"))
        self.created_files.append(saved_path)

        mock_ai.assert_called_once()
        args, kwargs = mock_ai.call_args
        self.assertEqual(args[0], saved_path)
        self.assertEqual(args[2], MODEL_PATH)
        print("  [PASS] 11 - BackgroundTasks invocou processar_imagem_ia com o caminho e modelo corretos")

    def test_12_processar_imagem_ia_valid_image(self):
        """Valida a execução direta do script de IA com uma imagem de teste válida."""
        test_img = TEMP_IMAGES_DIR / "teste_ia_direto.jpg"
        test_img.write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xd9")
        self.created_files.append(test_img)

        resultado = processar_imagem_ia(test_img, delay_seconds=0.0)
        self.assertEqual(resultado.get("status"), "completed")
        self.assertEqual(resultado.get("image_name"), test_img.name)
        self.assertIn("summary", resultado)
        print("  [PASS] 12 - processar_imagem_ia concluiu avaliação de imagem válida com sucesso")

    def test_13_processar_imagem_ia_nonexistent_image(self):
        """Valida a resiliência do script de IA ao receber caminho de imagem inexistente."""
        fake_img = TEMP_IMAGES_DIR / "arquivo_fantasma.jpg"
        resultado = processar_imagem_ia(fake_img, delay_seconds=0.0)
        self.assertEqual(resultado.get("status"), "error")
        self.assertIn("não encontrada", resultado.get("error", ""))
        print("  [PASS] 13 - Tratamento resiliente para imagem inexistente (sem exceção não tratada)")

    def test_14_processar_imagem_ia_missing_model(self):
        """Valida o tratamento de erro do script de IA caso o arquivo do modelo não seja localizado."""
        test_img = TEMP_IMAGES_DIR / "teste_ia_sem_modelo.jpg"
        test_img.write_bytes(b"\xff\xd8\xff\xe0" + b"X" * 16)
        self.created_files.append(test_img)

        resultado = processar_imagem_ia(test_img, delay_seconds=0.0, model_path=Path("modelo_inexistente.pt"))
        self.assertEqual(resultado.get("status"), "error")
        self.assertIn("Arquivo do modelo não encontrado", resultado.get("error", ""))
        print("  [PASS] 14 - Tratamento resiliente para modelo inexistente")

    def test_15_carregar_modelo_yolo_invalid_path(self):
        """Valida que carregar_modelo_yolo retorna None com segurança para caminho inexistente."""
        modelo = carregar_modelo_yolo(Path("inexistente.pt"))
        self.assertIsNone(modelo)
        print("  [PASS] 15 - carregar_modelo_yolo retorna None com segurança para arquivo inexistente")

    @patch("time.sleep")
    def test_16_processar_imagem_ia_delay_called(self, mock_sleep):
        """Valida que o requisito de pausa (delay de 1s) para 'acordar' a IA é respeitado."""
        test_img = TEMP_IMAGES_DIR / "teste_delay.jpg"
        test_img.write_bytes(b"\xff\xd8\xff\xe0" + b"X" * 16)
        self.created_files.append(test_img)

        processar_imagem_ia(test_img, delay_seconds=1.0)
        mock_sleep.assert_called_with(1.0)
        print("  [PASS] 16 - Requisito de delay de 1.0s validado (time.sleep chamado com 1.0)")

    @patch("ai_engine.carregar_modelo_yolo")
    def test_17_processar_imagem_ia_with_ultralytics_mock(self, mock_load):
        """Valida execução da inferência quando o motor ultralytics está ativo e retorna predições."""
        mock_model = MagicMock()
        mock_prediction = MagicMock()
        mock_prediction.boxes = [MagicMock(), MagicMock(), MagicMock()]  # 3 detecções
        mock_model.predict.return_value = [mock_prediction]
        mock_load.return_value = mock_model

        test_img = TEMP_IMAGES_DIR / "teste_ia_yolo_mock.jpg"
        test_img.write_bytes(b"\xff\xd8\xff\xe0" + b"X" * 16)
        self.created_files.append(test_img)

        resultado = processar_imagem_ia(test_img, delay_seconds=0.0)
        self.assertEqual(resultado.get("status"), "completed")
        self.assertEqual(resultado.get("engine"), "ultralytics")
        self.assertEqual(resultado.get("detections_count"), 3)
        self.assertEqual(resultado.get("summary", {}).get("falhas_identificadas"), 3)
        print("  [PASS] 17 - Inferência com mock do Ultralytics processada com contagem de detecções correta")

    @patch("ai_engine.carregar_modelo_yolo")
    def test_18_processar_imagem_ia_unexpected_exception(self, mock_load):
        """Valida tratamento seguro contra falhas críticas de hardware/memória durante predição."""
        mock_load.side_effect = RuntimeError("Falha de alocação de memória na GPU")

        test_img = TEMP_IMAGES_DIR / "teste_ia_erro.jpg"
        test_img.write_bytes(b"\xff\xd8\xff\xe0" + b"X" * 16)
        self.created_files.append(test_img)

        resultado = processar_imagem_ia(test_img, delay_seconds=0.0)
        self.assertEqual(resultado.get("status"), "error")
        self.assertIn("Falha de alocação", resultado.get("error", ""))
        print("  [PASS] 18 - Captura e resposta graciosa em caso de exceção de baixo nível na IA")

    @patch("ai_engine.DEFAULT_MODEL_PATH")
    def test_19_carregar_modelo_yolo_instantiation_error(self, mock_path):
        """Valida que carregar_modelo_yolo trata falhas ao instanciar o modelo."""
        mock_path.exists.return_value = True
        with patch.dict("sys.modules", {"ultralytics": MagicMock()}):
            import sys
            sys.modules["ultralytics"].YOLO.side_effect = Exception("Pesos corrompidos")
            modelo = carregar_modelo_yolo(mock_path)
            self.assertIsNone(modelo)
        print("  [PASS] 19 - carregar_modelo_yolo trata erro de instanciação retornando None")

    def test_20_get_anomalies_endpoint_success(self):
        """Valida se a rota GET /api/anomalies responde com HTTP 200 e lista JSON."""
        response = self.client.get("/api/anomalies")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        primeira_falha = data[0]
        self.assertIn("id", primeira_falha)
        self.assertIn("name", primeira_falha)
        self.assertIn("coordinates", primeira_falha)
        self.assertIn("severity", primeira_falha)
        print(f"  [PASS] 20 - Rota GET /api/anomalies respondeu 200 OK com {len(data)} falhas")

    @patch("database.get_supabase_client")
    def test_21_get_anomalies_supabase_select(self, mock_get_client):
        """Valida que a rota executa um SELECT * na tabela 'anomalies' do Supabase."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [
            {
                "id": "falha-supabase-01",
                "name": "Falha Talhão Norte",
                "type": "falha_plantio",
                "severity": "alta",
                "coordinates": [[-22.408, -47.562], [-22.409, -47.561], [-22.410, -47.563]],
                "customAreaM2": 15000,
            }
        ]
        mock_client.table.return_value.select.return_value.execute.return_value = mock_response
        mock_get_client.return_value = mock_client

        response = self.client.get("/api/anomalies")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], "falha-supabase-01")

        # Verifica se o SELECT foi chamado corretamente na tabela 'anomalies'
        mock_client.table.assert_called_with("anomalies")
        mock_client.table().select.assert_called_with("*")
        print("  [PASS] 21 - SELECT * na tabela 'anomalies' do Supabase verificado com sucesso")

    @patch("database.get_supabase_client")
    def test_22_get_anomalies_database_error_resilience(self, mock_get_client):
        """Valida que erros de conexão com o banco não quebram o endpoint e retornam dados de contingência."""
        mock_get_client.side_effect = ConnectionError("Supabase indisponível no momento")

        response = self.client.get("/api/anomalies")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(data, FALLBACK_ANOMALIES)
        print("  [PASS] 22 - Resiliência confirmada: retorno de contingência com HTTP 200 em caso de erro no banco")

    def test_23_database_get_all_anomalies_direct_call(self):
        """Valida a execução direta da função get_all_anomalies() no módulo database."""
        anomalies = get_all_anomalies()
        self.assertIsInstance(anomalies, list)
        self.assertGreater(len(anomalies), 0)
        print(f"  [PASS] 23 - get_all_anomalies() executado diretamente retornou {len(anomalies)} itens")

    def test_24_dependency_injection_override_anomaly_service(self):
        """Valida que a injeção de dependência (Depends) de AnomalyService pode ser substituída via dependency_overrides."""
        mock_service = MagicMock(spec=AnomalyService)
        mock_service.get_all_anomalies_async = AsyncMock(
            return_value=[{"id": "mock-di-anomaly", "name": "Falha Injetada via DI"}]
        )
        app.dependency_overrides[get_anomaly_service] = lambda: mock_service

        try:
            response = self.client.get("/api/anomalies")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(len(data), 1)
            self.assertEqual(data[0]["id"], "mock-di-anomaly")
            mock_service.get_all_anomalies_async.assert_called_once()
            print("  [PASS] 24 - Injeção de dependência de AnomalyService substituída e validada via Depends")
        finally:
            app.dependency_overrides.clear()

    def test_25_dependency_injection_override_storage_service(self):
        """Valida que o StorageService injetado via Depends é chamado no endpoint /upload."""
        mock_storage = MagicMock(spec=StorageService)
        fake_path = TEMP_IMAGES_DIR / "mock_di_saved.png"
        mock_storage.validate_extension.return_value = ".png"
        mock_storage.save_image_async = AsyncMock(return_value=(fake_path, 1234))
        app.dependency_overrides[get_storage_service] = lambda: mock_storage

        try:
            file_payload = {"file": ("teste_di.png", io.BytesIO(b"\x89PNG\r\n" + b"X" * 10), "image/png")}
            response = self.client.post("/upload", files=file_payload)
            self.assertEqual(response.status_code, 201)
            data = response.json()
            self.assertEqual(data.get("filename"), "mock_di_saved.png")
            self.assertEqual(data.get("size_bytes"), 1234)
            mock_storage.save_image_async.assert_called_once()
            print("  [PASS] 25 - Injeção de dependência de StorageService substituída e validada no /upload")
        finally:
            app.dependency_overrides.clear()

    def test_26_async_storage_service_save_and_delete(self):
        """Valida gravação e exclusão assíncrona não-bloqueante no StorageService."""
        storage = StorageService()
        test_file = UploadFile(
            file=io.BytesIO(b"conteudo_assincrono_teste"),
            filename="teste_stream_async.jpg",
            headers={"content-type": "image/jpeg"},
        )

        saved_path, size = asyncio.run(storage.save_image_async(test_file))
        self.assertTrue(saved_path.exists())
        self.assertEqual(size, len(b"conteudo_assincrono_teste"))

        # Testa remoção assíncrona não-bloqueante
        removido = asyncio.run(storage.delete_image_async(saved_path))
        self.assertTrue(removido)
        self.assertFalse(saved_path.exists())
        print(f"  [PASS] 26 - StorageService: streaming assíncrono e deleção validada ({size} bytes)")

    def test_27_ai_service_singleton_model_cache(self):
        """Valida o padrão Singleton de cache em memória no AIService (evita reinstanciação a cada foto)."""
        ai = AIService()
        m1 = ai.get_or_load_model()
        m2 = ai.get_or_load_model()
        # Valida que o cache em memória foi alimentado e retorna a mesma referência
        self.assertIs(m1, m2)
        print("  [PASS] 27 - AIService: cache singleton de modelo em memória validado com sucesso")

    def test_28_ai_service_process_image_async(self):
        """Valida a rotina assíncrona de inferência da IA (process_image_async) de forma não-bloqueante."""
        ai = AIService()
        test_img = TEMP_IMAGES_DIR / "teste_ai_service_async.jpg"
        test_img.write_bytes(b"\xff\xd8\xff\xe0" + b"X" * 16)
        self.created_files.append(test_img)

        resultado = asyncio.run(ai.process_image_async(test_img, delay_seconds=0.0))
        self.assertEqual(resultado.get("status"), "completed")
        self.assertEqual(resultado.get("image_name"), test_img.name)
        print("  [PASS] 28 - AIService: process_image_async executado assincronamente com sucesso")

    def test_29_upload_returns_weed_detections_and_bounding_boxes(self):
        """Valida que o endpoint /upload retorna detecções de ervas daninhas com bounding boxes do modelo best.pt."""
        amostra_path = Path(__file__).resolve().parent.parent / "cv_engine" / "amostra_erva_daninha.jpg"
        if not amostra_path.exists():
            self.skipTest(f"Imagem de amostra não encontrada em: {amostra_path}")

        with open(amostra_path, "rb") as f:
            file_payload = {"file": ("amostra_erva_daninha.jpg", f, "image/jpeg")}
            response = self.client.post("/upload", files=file_payload)

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("ai_status"), "enqueued")
        self.assertIn("detections", data)
        self.assertIn("summary", data)

        # Registra arquivo para limpeza
        saved_path = Path(data.get("saved_path"))
        self.created_files.append(saved_path)

        detections = data["detections"]
        self.assertIsInstance(detections, list)
        self.assertGreater(len(detections), 0, "O modelo best.pt deve detectar ao menos um foco na amostra")

        # Verifica se ao menos uma detecção é erva daninha
        weeds = [d for d in detections if d.get("type") == "erva_daninha"]
        self.assertGreater(len(weeds), 0, "Deve haver detecções do tipo 'erva_daninha'")

        # Valida estrutura da caixa delimitadora (bounding box) da primeira erva daninha
        first_weed = weeds[0]
        self.assertIn("box", first_weed)
        box = first_weed["box"]
        self.assertIn("x", box)
        self.assertIn("y", box)
        self.assertIn("width", box)
        self.assertIn("height", box)

        # Valida que as coordenadas estão em porcentagem (0 a 100)
        self.assertGreaterEqual(box["x"], 0)
        self.assertLessEqual(box["x"], 100)
        self.assertGreaterEqual(box["y"], 0)
        self.assertLessEqual(box["y"], 100)
        self.assertGreater(box["width"], 0)
        self.assertGreater(box["height"], 0)

        summary = data["summary"]
        self.assertGreater(summary.get("total_ervas_daninhas", 0), 0)
        self.assertGreater(summary.get("taxa_infestacao_percent", 0), 0)
        print(f"  [PASS] 29 - Upload integrado com best.pt retornou {len(weeds)} ervas daninhas com bounding boxes")

    def test_30_weed_bounding_boxes_format_validation(self):
        """Valida que a função extract_yolo_detections normaliza caixas delimitadoras e calcula severidade."""
        ai = AIService()
        amostra_path = Path(__file__).resolve().parent.parent / "cv_engine" / "amostra_erva_daninha.jpg"
        if not amostra_path.exists():
            self.skipTest("Imagem de amostra não encontrada")

        resultado = asyncio.run(ai.detect_image_async(amostra_path))
        self.assertEqual(resultado.get("status"), "completed")
        self.assertEqual(resultado.get("engine"), "ultralytics")

        detections = resultado.get("detections", [])
        self.assertGreater(len(detections), 0)

        for det in detections:
            self.assertIn("id", det)
            self.assertIn("label", det)
            self.assertIn("confidence", det)
            self.assertIn("severity", det)
            self.assertIn(det["severity"], ["baixa", "media", "alta"])
            self.assertIn("box", det)
            self.assertIn("box_pixels", det)

        print(f"  [PASS] 30 - Formato das bounding boxes e severidades validado para {len(detections)} detecções")

    def test_31_get_images_endpoint(self):
        """Valida que o endpoint GET /api/images e /api/amostras retornam status 200 e lista de amostras do banco."""
        for endpoint in ["/api/images", "/api/amostras"]:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 200, f"Falha na rota {endpoint}")
            data = response.json()
            self.assertIsInstance(data, list, f"Resposta de {endpoint} deve ser uma lista")
            self.assertGreater(len(data), 0, "O banco de dados deve retornar ao menos uma amostra")
            first_item = data[0]
            self.assertIn("id", first_item)
            self.assertIn("filename", first_item)
            self.assertIn("status", first_item)
            self.assertIn("uploaded_at", first_item)
            self.assertIn("total_anomalies", first_item)
            self.assertIn("total_area_ha", first_item)
        print("  [PASS] 31 - Endpoints GET /api/images e /api/amostras validados com sucesso")

    def test_32_database_get_all_images(self):
        """Valida a consulta direta à tabela 'images' via get_all_images()."""
        from database import get_all_images
        imgs = get_all_images()
        self.assertIsInstance(imgs, list)
        self.assertGreaterEqual(len(imgs), 1)
        sample = imgs[0]
        self.assertTrue(sample["filename"])
        self.assertIn("anomalies", sample)
        print(f"  [PASS] 32 - Consulta get_all_images() retornou {len(imgs)} amostras válidas")

    def test_33_image_service_async(self):
        """Valida ImageService e inserção/consulta assíncrona."""
        from app.services.image_service import ImageService
        service = ImageService()
        items = asyncio.run(service.get_all_images_async())
        self.assertIsInstance(items, list)
        self.assertGreaterEqual(len(items), 1)
        print(f"  [PASS] 33 - ImageService assíncrono validado com sucesso")


if __name__ == "__main__":
    print("\n" + "=" * 65)
    print("  EXECUTANDO BATERIA DE TESTES - BACKEND SUGARVISION")
    print("=" * 65 + "\n")
    unittest.main(verbosity=0)


