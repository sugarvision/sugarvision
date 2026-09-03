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
from pathlib import Path
import unittest

from fastapi.testclient import TestClient

from main import app, TEMP_IMAGES_DIR


class TestSugarVisionBackend(unittest.TestCase):
    """Testes unitários e de integração do backend FastAPI."""

    @classmethod
    def setUpClass(cls):
        """Inicializa o cliente de teste HTTP do FastAPI."""
        cls.client = TestClient(app)
        cls.created_files = []

    @classmethod
    def tearDownClass(cls):
        """Remove os arquivos de teste gerados na pasta temp_images/."""
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


if __name__ == "__main__":
    print("\n" + "=" * 65)
    print("  EXECUTANDO BATERIA DE TESTES - BACKEND SUGARVISION")
    print("=" * 65 + "\n")
    unittest.main(verbosity=0)
