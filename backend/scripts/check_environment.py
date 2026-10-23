"""Diagnóstico do ambiente do backend (usado por start_production_server.ps1).

Imprime UMA linha JSON no stdout com:
  - missing: módulos Python ausentes (nome do pacote pip a instalar);
  - compute: integridade de GPU/CPU (CUDA disponível, nome, VRAM e teste real de tensor).

Não carrega o modelo YOLO. Sempre retorna exit code 0; o chamador decide o que fazer.
"""

import importlib.util
import json
import sys

# módulo importável -> pacote pip
REQUIRED = {
    "fastapi": "fastapi",
    "uvicorn": "uvicorn[standard]",
    "multipart": "python-multipart",
    "dotenv": "python-dotenv",
    "supabase": "supabase",
    "ultralytics": "ultralytics",
    "cv2": "opencv-python",
    "PIL": "pillow",
    "psycopg2": "psycopg2-binary",
    "jwt": "PyJWT",
    "psutil": "psutil",
}


def find_missing() -> list[str]:
    return [pip for mod, pip in REQUIRED.items() if importlib.util.find_spec(mod) is None]


def check_compute() -> dict:
    info = {
        "torch": None,
        "cuda_available": False,
        "device": "cpu",
        "gpu_name": None,
        "vram_total_gb": None,
        "self_test": "skipped",
        "error": None,
    }
    try:
        import torch
    except Exception as exc:  # noqa: BLE001
        info["error"] = f"torch indisponível: {exc}"
        return info

    info["torch"] = torch.__version__
    try:
        if torch.cuda.is_available():
            info["cuda_available"] = True
            info["device"] = "cuda:0"
            props = torch.cuda.get_device_properties(0)
            info["gpu_name"] = props.name
            info["vram_total_gb"] = round(props.total_memory / 1024 ** 3, 2)
        # Teste real de operação no dispositivo (detecta driver/GPU corrompido).
        x = torch.ones(256, 256, device=info["device"])
        value = float((x @ x).sum().item())
        info["self_test"] = "ok" if value == 256 * 256 * 256 else "wrong_result"
    except Exception as exc:  # noqa: BLE001
        info["self_test"] = "failed"
        info["error"] = str(exc)
    return info


def main() -> int:
    print(json.dumps({"python": sys.version.split()[0], "missing": find_missing(), "compute": check_compute()}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
