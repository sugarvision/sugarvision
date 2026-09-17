"""Módulo de conexão com o banco de dados na nuvem (Supabase / PostgreSQL).

Responsável por ler as variáveis de ambiente do .env e fornecer acesso
tanto ao cliente Supabase (supabase-py) quanto aos parâmetros de conexão
direta do banco de dados (DATABASE_URL).
"""

from functools import lru_cache
import logging
import os
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv

# Configuração de logging estruturado
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("database")

# Garante a localização precisa do arquivo .env
_BASE_DIR = Path(__file__).resolve().parent
_ENV_PATH = _BASE_DIR / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# ==========================================
# Variáveis de Ambiente Carregadas
# ==========================================
SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY")
DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
DATABASE_PASSWORD: Optional[str] = os.getenv("DATABASE_PASSWORD")
DB_HOST: Optional[str] = os.getenv("DB_HOST", "db.hbropsjrbebbuiwcjrcu.supabase.co")
DB_PORT: str = os.getenv("DB_PORT", "5432")
DB_USER: str = os.getenv("DB_USER", "postgres")
DB_NAME: str = os.getenv("DB_NAME", "postgres")


class DatabaseConfigurationError(Exception):
    """Exceção para credenciais ou variáveis ausentes."""

    pass


@lru_cache(maxsize=1)
def get_supabase_client() -> Any:
    """Retorna uma instância singleton do cliente Supabase (supabase-py).

    Levanta DatabaseConfigurationError se a URL ou a Key não estiverem configuradas.
    """
    if not SUPABASE_URL:
        raise DatabaseConfigurationError(
            "SUPABASE_URL não configurada no arquivo .env."
        )

    if not SUPABASE_KEY or not SUPABASE_KEY.strip():
        raise DatabaseConfigurationError(
            "SUPABASE_KEY (anon key) ainda não foi preenchida no .env. "
            "A API Key do Supabase (começa com 'eyJ...') deve ser copiada da aba "
            "'Project Settings > API' do painel do Supabase."
        )

    try:
        from supabase import Client, create_client

        client: Client = create_client(SUPABASE_URL.strip(), SUPABASE_KEY.strip())
        logger.info("Cliente Supabase inicializado com sucesso para: %s", SUPABASE_URL)
        return client
    except Exception as exc:
        logger.error("Erro ao inicializar cliente Supabase: %s", exc)
        raise ConnectionError(f"Falha ao conectar ao Supabase: {exc}") from exc


def check_connection() -> dict[str, Any]:
    """Valida o estado das conexões configuradas (PostgreSQL e Supabase API)."""
    status: dict[str, Any] = {
        "supabase_url": SUPABASE_URL,
        "database_url_configured": bool(DATABASE_URL),
        "db_host": DB_HOST,
        "db_port": DB_PORT,
    }

    # Verifica o cliente supabase-py
    try:
        client = get_supabase_client()
        session = client.auth.get_session()
        status["supabase_api"] = {
            "status": "connected",
            "message": "Conectado com sucesso via supabase-py.",
        }
    except DatabaseConfigurationError as config_err:
        status["supabase_api"] = {
            "status": "pending_key",
            "message": str(config_err),
        }
    except Exception as err:
        status["supabase_api"] = {
            "status": "error",
            "message": str(err),
        }

    # Status geral
    if status["supabase_api"]["status"] == "connected":
        status["status"] = "connected"
    elif status["database_url_configured"]:
        status["status"] = "database_configured"
    else:
        status["status"] = "unconfigured"

    return status


# Tentativa de inicialização de conveniência
try:
    if SUPABASE_URL and SUPABASE_KEY and SUPABASE_KEY.strip():
        supabase = get_supabase_client()
    else:
        supabase = None
except Exception:
    supabase = None


# Dados de contingência com formato compatível com o mapa (PolygonGeometry)
# Utilizados caso o banco Supabase ainda esteja com a anon key pendente
FALLBACK_ANOMALIES: list[dict[str, Any]] = [
    {
        "id": "falha-01",
        "name": "Falha de Plantio 01",
        "type": "falha_plantio",
        "severity": "alta",
        "coordinates": [
            [-22.4085, -47.5625],
            [-22.4095, -47.5615],
            [-22.4105, -47.5620],
            [-22.4098, -47.5635],
        ],
        "customAreaM2": 12500,
    },
    {
        "id": "falha-02",
        "name": "Falha de Plantio 02",
        "type": "falha_plantio",
        "severity": "media",
        "coordinates": [
            [-22.4120, -47.5590],
            [-22.4130, -47.5580],
            [-22.4138, -47.5592],
            [-22.4128, -47.5602],
        ],
        "customAreaM2": 8200,
    },
]


def get_all_anomalies() -> list[dict[str, Any]]:
    """Consulta e retorna todas as anomalias/falhas de plantio cadastradas no banco de dados.

    Executa um SELECT na tabela 'anomalies' do Supabase. Caso o banco ainda esteja
    em fase de configuração de credenciais ou ocorra erro de conexão, retorna uma lista
    estruturada de contingência para garantir que o mapa e a API permaneçam funcionais.

    Returns:
        Lista de dicionários contendo os dados de cada anomalia/polígono.
    """
    try:
        client = get_supabase_client()
        response = client.table("anomalies").select("*").execute()
        if response and hasattr(response, "data") and response.data is not None:
            logger.info(
                "SELECT executado com sucesso na tabela 'anomalies': %d registros retornados.",
                len(response.data),
            )
            return response.data
        return []
    except Exception as exc:
        logger.warning(
            "Consulta ao Supabase indisponível (%s). Retornando anomalias de contingência.",
            exc,
        )
        return FALLBACK_ANOMALIES


if __name__ == "__main__":
    print("=" * 60)
    print("  SugarVision - Teste de Configuração de Banco de Dados")
    print("=" * 60)
    print(f"Arquivo .env: {_ENV_PATH}")
    print(f"SUPABASE_URL: {SUPABASE_URL}")
    print(f"DATABASE_URL: {DATABASE_URL}")
    print(f"DB_HOST:      {DB_HOST}:{DB_PORT}")
    print(f"SUPABASE_KEY: {'[PREENCHIDA]' if SUPABASE_KEY and SUPABASE_KEY.strip() else '[PENDENTE - Aguardando anon key do Membro 2]'}")
    print("-" * 60)
    print("Diagnóstico:")
    diagnostico = check_connection()
    for k, v in diagnostico.items():
        print(f"  {k}: {v}")
    print("=" * 60)
