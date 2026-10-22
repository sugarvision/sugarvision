"""Script executável para limpeza de arquivos temporários de imagens no backend SugarVision.

Sprint 7 - Membro 2 (DB / Guilherme)
Executa a varredura do diretório temp_images e exclui arquivos com mais de 7 dias (ou valor configurável via --days).
Preserva arquivos semente de teste e sistema (.gitkeep, cana_teste.jpg, etc.).
"""

import argparse
import logging
import sys
from pathlib import Path

# Adiciona o diretório backend ao sys.path para importações dos módulos do app
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.storage_service import StorageService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cleanup-temp-images")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rotina de limpeza de imagens temporárias antigas geradas durante inferências."
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Número mínimo de dias de inatividade/criação para remoção (padrão: 7 dias).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula a execução sem excluir arquivos fisicamente.",
    )

    args = parser.parse_args()

    logger.info("Iniciando rotina de limpeza de arquivos temporários (idade > %d dias)...", args.days)

    storage = StorageService()

    if args.dry_run:
        import time
        now = time.time()
        max_age_seconds = args.days * 86400.0
        scanned = 0
        to_delete = []
        for item in storage.target_dir.glob("*"):
            if not item.is_file():
                continue
            scanned += 1
            if item.name.startswith(".") or item.name in {"cana_teste.jpg", "amostra_erva_daninha.jpg", "trigo_teste.png"}:
                continue
            try:
                age = now - item.stat().st_mtime
                if age > max_age_seconds:
                    to_delete.append((item.name, age / 86400.0))
            except Exception as e:
                logger.warning("Erro ao verificar %s: %s", item, e)

        logger.info(
            "[DRY-RUN] %d arquivos verificados. %d seriam excluídos: %s",
            scanned,
            len(to_delete),
            to_delete,
        )
        return 0

    stats = storage.cleanup_temp_images_sync(days=args.days)
    logger.info("Resultado da limpeza: %s", stats)
    return 0 if stats["errors"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
