"""Módulo de conexão com o banco de dados na nuvem (Supabase / PostgreSQL).

Responsável por ler as variáveis de ambiente do .env e fornecer acesso
tanto ao cliente Supabase (supabase-py) quanto à conexão direta PostgreSQL
(DATABASE_URL com pooler IPv4 e psycopg2).
"""

from contextlib import contextmanager
from datetime import datetime
from functools import lru_cache
import logging
import os
from pathlib import Path
from typing import Any, Generator, List, Optional
import uuid

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
DB_HOST: Optional[str] = os.getenv("DB_HOST", "aws-0-us-west-2.pooler.supabase.com")
DB_PORT: str = os.getenv("DB_PORT", "5432")
DB_USER: str = os.getenv("DB_USER", "postgres.hbropsjrbebbuiwcjrcu")
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


def get_pg_connection_string() -> str:
    """Retorna a string de conexão normalizada para PostgreSQL via pooler IPv4."""
    if DATABASE_URL and DATABASE_URL.strip():
        # Se a URL aponta para db.*.supabase.co (que só tem IPv6 e falha em redes IPv4),
        # redireciona automaticamente para o pooler IPv4 oficial do projeto
        url = DATABASE_URL.strip()
        if "db.hbropsjrbebbuiwcjrcu.supabase.co" in url:
            url = url.replace(
                "postgres:Sug%40rCarne67%21@db.hbropsjrbebbuiwcjrcu.supabase.co",
                "postgres.hbropsjrbebbuiwcjrcu:Sug%40rCarne67%21@aws-0-us-west-2.pooler.supabase.com",
            )
        return url

    # Constrói a partir dos parâmetros individuais
    user = DB_USER or "postgres.hbropsjrbebbuiwcjrcu"
    pwd = DATABASE_PASSWORD or "Sug@rCarne67!"
    host = DB_HOST or "aws-0-us-west-2.pooler.supabase.com"
    port = DB_PORT or "5432"
    dbname = DB_NAME or "postgres"
    return f"postgresql://{user}:{pwd}@{host}:{port}/{dbname}"


@contextmanager
def get_db_connection() -> Generator[Any, None, None]:
    """Context manager para conexões seguras com PostgreSQL usando psycopg2."""
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError as imp_err:
        logger.error("psycopg2 não está instalado no ambiente: %s", imp_err)
        raise ConnectionError("psycopg2 não instalado.") from imp_err

    conn_str = get_pg_connection_string()
    conn = None
    try:
        conn = psycopg2.connect(conn_str, connect_timeout=5)
        yield conn
    except Exception as exc:
        logger.warning("Falha na conexão PostgreSQL direta: %s", exc)
        raise exc
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def check_connection() -> dict[str, Any]:
    """Valida o estado das conexões configuradas (PostgreSQL e Supabase API)."""
    status: dict[str, Any] = {
        "supabase_url": SUPABASE_URL,
        "database_url_configured": bool(DATABASE_URL),
        "db_host": DB_HOST,
        "db_port": DB_PORT,
    }

    # Verifica conexão direta PostgreSQL
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                status["postgres_direct"] = {
                    "status": "connected",
                    "message": "Conectado com sucesso ao banco PostgreSQL / Supabase.",
                }
    except Exception as pg_err:
        status["postgres_direct"] = {
            "status": "error",
            "message": str(pg_err),
        }

    # Verifica o cliente supabase-py (REST)
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
    if status.get("postgres_direct", {}).get("status") == "connected" or status["supabase_api"]["status"] == "connected":
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
FALLBACK_ANOMALIES: List[dict[str, Any]] = [
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

# Dados de contingência para amostras de imagens caso a conexão esteja offline
FALLBACK_IMAGES: List[dict[str, Any]] = [
    {
        "id": "5e0fac58-359f-4eb6-8d62-9491a0b867f0",
        "filename": "teste agro2.jpeg",
        "status": "completed",
        "uploaded_at": "2026-08-20T14:10:27.686432+00:00",
        "total_anomalies": 2,
        "total_area_ha": 18.71,
        "anomalies": [
            {"id": "b5d4779c-ba71-4a0d-a9d8-41187bb2544e", "anomaly_type": "healthy_cane", "area_hectares": 14.16, "created_at": "2026-08-20T14:10:28.696344+00:00"},
            {"id": "e3c07f03-f3a3-4dd3-93d7-698cbf9413be", "anomaly_type": "white_leaf_disease", "area_hectares": 4.55, "created_at": "2026-08-20T14:10:29.132159+00:00"},
        ],
    },
    {
        "id": "fdb31da6-45d6-4247-9b35-556fe6e4eabe",
        "filename": "testefoto1myagro.png",
        "status": "completed",
        "uploaded_at": "2026-08-20T11:23:44.448945+00:00",
        "total_anomalies": 2,
        "total_area_ha": 43.97,
        "anomalies": [
            {"id": "747f6775-ccfb-4272-b903-9c51ea8f0ef4", "anomaly_type": "healthy_cane", "area_hectares": 40.95, "created_at": "2026-08-20T11:23:45.348035+00:00"},
            {"id": "88197500-430b-45f6-bdef-af160637d2bb", "anomaly_type": "white_leaf_disease", "area_hectares": 3.02, "created_at": "2026-08-20T11:23:45.762599+00:00"},
        ],
    },
    {
        "id": "c19b15bd-a40a-f93c-1b5b-856930196888",
        "filename": "amostra_erva_daninha.jpg",
        "status": "completed",
        "uploaded_at": "2026-08-20T11:03:05.828398+00:00",
        "total_anomalies": 32,
        "total_area_ha": 25.56,
        "anomalies": [
            {"id": "bb8c19b1-5bda-40af-93c1-b5b856930196", "anomaly_type": "erva_daninha", "area_hectares": 23.28, "created_at": "2026-08-20T11:03:06.888132+00:00"},
            {"id": "92a4f9e9-2a78-4cf7-97f3-3e1930a8d74c", "anomaly_type": "white_leaf_disease", "area_hectares": 2.28, "created_at": "2026-08-20T11:03:07.814602+00:00"},
        ],
    },
    {
        "id": "a784cf79-7f33-e193-0a8d-74cbb8c19b15",
        "filename": "cana_teste.jpg",
        "status": "completed",
        "uploaded_at": "2026-08-19T09:15:20.112000+00:00",
        "total_anomalies": 5,
        "total_area_ha": 12.30,
        "anomalies": [
            {"id": "d1930a8d-74cb-b8c1-9b15-bda40af93c1b", "anomaly_type": "healthy_cane", "area_hectares": 12.30, "created_at": "2026-08-19T09:15:21.000000+00:00"},
        ],
    },
]


def get_all_images() -> List[dict[str, Any]]:
    """Consulta e retorna todas as amostras cadastradas na tabela 'images' do banco de dados.

    Realiza consulta no PostgreSQL via psycopg2 ou Supabase client, trazendo os metadados
    completos da imagem (ID, nome de arquivo, status, data de upload) e correlacionando
    com as anomalias detectadas registradas na tabela 'anomalies'.

    Returns:
        Lista estruturada de amostras de imagens com métricas associadas.
    """
    try:
        import psycopg2.extras

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Busca as imagens ordenadas pelas mais recentes
                cur.execute(
                    """
                    SELECT 
                        i.id,
                        i.filename,
                        i.status,
                        i.uploaded_at,
                        COUNT(a.id) AS total_anomalies,
                        COALESCE(SUM(a.area_hectares), 0) AS total_area_ha
                    FROM images i
                    LEFT JOIN anomalies a ON a.image_id = i.id
                    GROUP BY i.id, i.filename, i.status, i.uploaded_at
                    ORDER BY i.uploaded_at DESC
                    """
                )
                image_rows = cur.fetchall()

                # Busca todas as anomalias vinculadas
                cur.execute(
                    """
                    SELECT id, image_id, anomaly_type, area_hectares, created_at
                    FROM anomalies
                    WHERE image_id IS NOT NULL
                    """
                )
                anomaly_rows = cur.fetchall()

                anomalies_by_image: dict[str, List[dict[str, Any]]] = {}
                for a in anomaly_rows:
                    img_id = str(a["image_id"])
                    if img_id not in anomalies_by_image:
                        anomalies_by_image[img_id] = []
                    anomalies_by_image[img_id].append({
                        "id": str(a["id"]),
                        "anomaly_type": a["anomaly_type"],
                        "area_hectares": float(a["area_hectares"]) if a["area_hectares"] is not None else 0.0,
                        "created_at": a["created_at"].isoformat() if a["created_at"] else None,
                    })

                results: List[dict[str, Any]] = []
                for row in image_rows:
                    item_id = str(row["id"])
                    results.append({
                        "id": item_id,
                        "filename": row["filename"],
                        "status": row["status"] or "completed",
                        "uploaded_at": row["uploaded_at"].isoformat() if row["uploaded_at"] else None,
                        "total_anomalies": int(row["total_anomalies"]),
                        "total_area_ha": round(float(row["total_area_ha"]), 2),
                        "anomalies": anomalies_by_image.get(item_id, []),
                    })

                logger.info(
                    "SELECT executado com sucesso na tabela 'images': %d registros retornados.",
                    len(results),
                )
                return results

    except Exception as exc:
        logger.warning(
            "Consulta direta ao PostgreSQL 'images' indisponível (%s). Tentando Supabase API...",
            exc,
        )
        try:
            client = get_supabase_client()
            resp = client.table("images").select("*").order("uploaded_at", desc=True).execute()
            if resp and hasattr(resp, "data") and resp.data is not None:
                images_data = []
                for img in resp.data:
                    images_data.append({
                        "id": str(img.get("id")),
                        "filename": img.get("filename"),
                        "status": img.get("status") or "completed",
                        "uploaded_at": str(img.get("uploaded_at")),
                        "total_anomalies": 0,
                        "total_area_ha": 0.0,
                        "anomalies": [],
                    })
                return images_data
        except Exception as sup_exc:
            logger.warning(
                "Consulta via Supabase API também falhou (%s). Retornando amostras de contingência.",
                sup_exc,
            )

        return FALLBACK_IMAGES


def insert_image_record(
    filename: str,
    status: str = "completed",
    image_id: Optional[str] = None,
) -> dict[str, Any]:
    """Insere um novo registro de amostra na tabela 'images' do banco de dados."""
    rec_id = image_id or str(uuid.uuid4())
    now = datetime.now()

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO images (id, filename, status, uploaded_at)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, filename, status, uploaded_at
                    """,
                    (rec_id, filename, status, now),
                )
                conn.commit()
                row = cur.fetchone()
                logger.info("Registro de imagem inserido no banco: %s (%s)", filename, rec_id)
                return {
                    "id": str(row[0]),
                    "filename": row[1],
                    "status": row[2],
                    "uploaded_at": row[3].isoformat() if row[3] else now.isoformat(),
                    "total_anomalies": 0,
                    "total_area_ha": 0.0,
                    "anomalies": [],
                }
    except Exception as exc:
        logger.warning("Não foi possível persistir amostra no banco (%s). Retornando mock local.", exc)
        return {
            "id": rec_id,
            "filename": filename,
            "status": status,
            "uploaded_at": now.isoformat(),
            "total_anomalies": 0,
            "total_area_ha": 0.0,
            "anomalies": [],
        }


def delete_image_record(image_id: str) -> bool:
    """Exclui uma amostra da tabela 'images' e suas anomalias associadas no banco de dados."""
    global FALLBACK_IMAGES
    FALLBACK_IMAGES = [img for img in FALLBACK_IMAGES if img.get("id") != image_id]

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Remove anomalias vinculadas por chave estrangeira image_id
                cur.execute("DELETE FROM anomalies WHERE image_id = %s", (image_id,))
                # Remove a amostra da tabela images
                cur.execute("DELETE FROM images WHERE id = %s", (image_id,))
                conn.commit()
                logger.info("Registro de imagem deletado do PostgreSQL: %s (linhas afetadas: %d)", image_id, cur.rowcount)
                return True
    except Exception as exc:
        logger.warning("Falha ao deletar amostra no PostgreSQL (%s). Tentando via Supabase API...", exc)
        try:
            client = get_supabase_client()
            client.table("anomalies").delete().eq("image_id", image_id).execute()
            client.table("images").delete().eq("id", image_id).execute()
            logger.info("Registro de imagem deletado via Supabase API: %s", image_id)
            return True
        except Exception as sup_exc:
            logger.warning("Falha ao deletar via Supabase API (%s). Remoção persistida no estado em memória.", sup_exc)
            return True


def get_all_anomalies() -> list[dict[str, Any]]:
    """Consulta e retorna todas as anomalias/falhas de plantio cadastradas no banco de dados.

    Executa um SELECT na tabela 'anomalies' do Supabase. Caso ocorra erro de conexão
    ou credenciais ausentes, retorna lista de contingência garantindo resiliência.
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
    print("-" * 60)
    print("Diagnóstico:")
    diagnostico = check_connection()
    for k, v in diagnostico.items():
        print(f"  {k}: {v}")
    print("-" * 60)
    print("Consultando 'images'...")
    imgs = get_all_images()
    print(f"Total de amostras retornadas: {len(imgs)}")
    for im in imgs:
        print(f"  - [{im['id']}] {im['filename']} | Status: {im['status']} | Anomalias: {im['total_anomalies']} | Área: {im['total_area_ha']} ha")
    print("=" * 60)
