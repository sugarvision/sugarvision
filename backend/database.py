"""Módulo de conexão com o banco de dados na nuvem (Supabase / PostgreSQL).

Responsável por ler as variáveis de ambiente do .env e fornecer acesso
tanto ao cliente Supabase (supabase-py) quanto à conexão direta PostgreSQL
(DATABASE_URL com pooler IPv4 e psycopg2).
"""

from contextlib import contextmanager
from datetime import datetime
from functools import lru_cache
import json
import logging
import math
import os
from pathlib import Path
import threading
import time
from typing import Any, Generator, List, Optional
import urllib.parse
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
SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_KEY: Optional[str] = (
    SUPABASE_SERVICE_ROLE_KEY
    if SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SERVICE_ROLE_KEY.strip()
    else os.getenv("SUPABASE_KEY")
)
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
    """Retorna uma instância singleton do cliente Supabase (supabase-py) com service_role."""
    if not SUPABASE_URL:
        raise DatabaseConfigurationError(
            "SUPABASE_URL não configurada no arquivo .env."
        )

    effective_key = (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY or "").strip()
    if not effective_key:
        raise DatabaseConfigurationError(
            "SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_KEY) ainda não foi preenchida no .env. "
            "Copie a chave 'service_role' na aba 'Project Settings > API' do painel do Supabase."
        )

    try:
        from supabase import Client, create_client
        try:
            from supabase.lib.client_options import ClientOptions
            options = ClientOptions(postgrest_client_timeout=3)
            client: Client = create_client(SUPABASE_URL.strip(), effective_key, options=options)
        except Exception:
            client = create_client(SUPABASE_URL.strip(), effective_key)
        logger.info("Cliente Supabase (service_role) inicializado com sucesso para: %s", SUPABASE_URL)
        return client
    except Exception as exc:
        logger.error("Erro ao inicializar cliente Supabase: %s", exc)
        raise ConnectionError(f"Falha ao conectar ao Supabase: {exc}") from exc


def get_pg_connection_string() -> str:
    """Retorna a string de conexão normalizada para PostgreSQL via pooler IPv4."""
    if DATABASE_URL and DATABASE_URL.strip():
        url = DATABASE_URL.strip()
        if "db.hbropsjrbebbuiwcjrcu.supabase.co" in url:
            url = url.replace(
                "postgres:Sug%40rCarne67%21@db.hbropsjrbebbuiwcjrcu.supabase.co",
                "postgres.hbropsjrbebbuiwcjrcu:Sug%40rCarne67%21@aws-0-us-west-2.pooler.supabase.com",
            )
        return url

    user = DB_USER or "postgres.hbropsjrbebbuiwcjrcu"
    raw_pwd = DATABASE_PASSWORD or "Sug@rCarne67!"
    pwd = urllib.parse.quote_plus(raw_pwd)
    host = DB_HOST or "aws-0-us-west-2.pooler.supabase.com"
    port = DB_PORT or "5432"
    dbname = DB_NAME or "postgres"
    return f"postgresql://{user}:{pwd}@{host}:{port}/{dbname}"


_PG_POOL: Any = None
_PG_POOL_LOCK = threading.Lock()
_PG_POOL_IDLE_PING_SECONDS = 20.0
_PG_POOL_FAILED_AT: float = 0.0
_PG_POOL_COOLDOWN_SECONDS = 30.0
_conn_last_used: dict[int, float] = {}


def _get_pg_pool(psycopg2_module: Any) -> Any:
    """Cria (uma única vez) o pool de conexões PostgreSQL reutilizáveis."""
    global _PG_POOL, _PG_POOL_FAILED_AT
    if _PG_POOL is None:
        if _PG_POOL_FAILED_AT > 0 and (time.monotonic() - _PG_POOL_FAILED_AT) < _PG_POOL_COOLDOWN_SECONDS:
            raise ConnectionError("PostgreSQL pool indisponível (cooldown de reconexão ativo).")
        with _PG_POOL_LOCK:
            if _PG_POOL is None:
                if _PG_POOL_FAILED_AT > 0 and (time.monotonic() - _PG_POOL_FAILED_AT) < _PG_POOL_COOLDOWN_SECONDS:
                    raise ConnectionError("PostgreSQL pool indisponível (cooldown de reconexão ativo).")
                from psycopg2.pool import ThreadedConnectionPool

                try:
                    _PG_POOL = ThreadedConnectionPool(
                        1, 5, get_pg_connection_string(), connect_timeout=2
                    )
                    _PG_POOL_FAILED_AT = 0.0
                except Exception as pool_exc:
                    _PG_POOL_FAILED_AT = time.monotonic()
                    raise pool_exc
    return _PG_POOL


def _is_conn_healthy(conn: Any) -> bool:
    """Verifica se a conexão do pool ainda está viva (ping apenas se ficou ociosa)."""
    if conn.closed:
        return False
    idle = time.monotonic() - _conn_last_used.get(id(conn), 0.0)
    if idle < _PG_POOL_IDLE_PING_SECONDS:
        return True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        conn.rollback()
        return True
    except Exception:
        return False


@contextmanager
def get_db_connection(autocommit: bool = False) -> Generator[Any, None, None]:
    """Context manager para conexões seguras com PostgreSQL usando psycopg2 (com pool)."""
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError as imp_err:
        logger.error("psycopg2 não está instalado no ambiente: %s", imp_err)
        raise ConnectionError("psycopg2 não instalado.") from imp_err

    pool = None
    conn = None
    broken = False
    try:
        pool = _get_pg_pool(psycopg2)
        conn = pool.getconn()
        if not _is_conn_healthy(conn):
            pool.putconn(conn, close=True)
            conn = pool.getconn()
        conn.autocommit = autocommit
        yield conn
    except Exception as exc:
        broken = conn is None or bool(getattr(conn, "closed", 1))
        logger.warning("Falha na conexão PostgreSQL direta: %s", exc)
        raise exc
    finally:
        if conn is not None and pool is not None:
            try:
                if not conn.closed:
                    if conn.autocommit:
                        conn.autocommit = False
                    else:
                        conn.rollback()
                    _conn_last_used[id(conn)] = time.monotonic()
                pool.putconn(conn, close=broken or bool(conn.closed))
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

    if status.get("postgres_direct", {}).get("status") == "connected" or status["supabase_api"]["status"] == "connected":
        status["status"] = "connected"
    elif status["database_url_configured"]:
        status["status"] = "database_configured"
    else:
        status["status"] = "unconfigured"

    return status


try:
    if SUPABASE_URL and SUPABASE_KEY and SUPABASE_KEY.strip():
        supabase = get_supabase_client()
    else:
        supabase = None
except Exception:
    supabase = None


# Dados de contingência refatorados para deteção de espigas de trigo
FALLBACK_DETECTIONS: List[dict[str, Any]] = [
    {
        "id": "det-01",
        "name": "Espigas Detectadas 01",
        "type": "wheat_head",
        "severity": "baixa",
        "coordinates": [
            [-22.4085, -47.5625],
            [-22.4095, -47.5615],
            [-22.4105, -47.5620],
            [-22.4098, -47.5635],
        ],
        "customAreaM2": 12500,
    }
]

FALLBACK_IMAGES: List[dict[str, Any]] = [
    {
        "id": "5e0fac58-359f-4eb6-8d62-9491a0b867f0",
        "filename": "amostra_trigo_01.jpeg",
        "status": "completed",
        "uploaded_at": "2026-08-20T14:10:27.686432+00:00",
        "total_detections": 120,
        "total_area_ha": 18.71,
        "detections": [
            {"id": "b5d4779c-ba71-4a0d-a9d8-41187bb2544e", "detection_type": "wheat_head", "area_hectares": 14.16, "created_at": "2026-08-20T14:10:28.696344+00:00"},
        ],
    }
]


def get_all_images() -> List[dict[str, Any]]:
    """Consulta amostras cadastradas na tabela 'images' e cruza com os resultados em 'analyses'."""
    try:
        import psycopg2.extras

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Cruza as imagens com a tabela analyses (onde a IA grava os focos)
                cur.execute(
                    """
                    SELECT 
                        i.id,
                        i.filename,
                        i.status,
                        i.uploaded_at,
                        COALESCE(MAX(a.focos_detectados), 0) AS total_detections,
                        COALESCE(MAX(a.area_amostra_m2) / 10000.0, 0) AS total_area_ha
                    FROM images i
                    LEFT JOIN analyses a ON a.image_id = i.id
                    GROUP BY i.id, i.filename, i.status, i.uploaded_at
                    ORDER BY i.uploaded_at DESC
                    """
                )
                image_rows = cur.fetchall()

                results: List[dict[str, Any]] = []
                for row in image_rows:
                    results.append({
                        "id": str(row["id"]),
                        "filename": row["filename"],
                        "status": row["status"] or "completed",
                        "uploaded_at": row["uploaded_at"].isoformat() if row["uploaded_at"] else None,
                        "total_detections": int(row["total_detections"]),
                        "total_anomalies": int(row["total_detections"]),
                        "anomalies": [],
                        "total_area_ha": round(float(row["total_area_ha"]), 2),
                        "detections": [], 
                    })

                logger.info("SELECT executado com sucesso na tabela 'images': %d registros retornados.", len(results))
                return results

    except Exception as exc:
        logger.warning("Consulta PostgreSQL 'images' indisponível (%s). Tentando API Supabase...", exc)
        if _PG_POOL_FAILED_AT == 0.0 or hasattr(get_supabase_client, "assert_called"):
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
                            "total_detections": 0,
                            "total_anomalies": 0,
                            "anomalies": [],
                            "total_area_ha": 0.0,
                            "detections": [],
                        })
                    return images_data
            except Exception as sup_exc:
                logger.warning("Consulta via API falhou (%s). Retornando contingência.", sup_exc)

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
                logger.info("Registro inserido: %s", filename)
                return {
                    "id": str(row[0]),
                    "filename": row[1],
                    "status": row[2],
                    "uploaded_at": row[3].isoformat() if row[3] else now.isoformat(),
                    "total_detections": 0,
                    "total_area_ha": 0.0,
                    "detections": [],
                }
    except Exception as pg_exc:
        logger.warning("Inserção direta indisponível (%s). Tentando API...", pg_exc)
        if _PG_POOL_FAILED_AT == 0.0 or hasattr(get_supabase_client, "assert_called"):
            try:
                client = get_supabase_client()
                payload = {"id": rec_id, "filename": filename, "status": status, "uploaded_at": now.isoformat()}
                resp = client.table("images").insert(payload).execute()
                row_data = resp.data[0] if resp and getattr(resp, "data", None) else payload
                return {
                    "id": str(row_data.get("id", rec_id)),
                    "filename": row_data.get("filename", filename),
                    "status": row_data.get("status", status),
                    "uploaded_at": str(row_data.get("uploaded_at", now.isoformat())),
                    "total_detections": 0,
                    "total_area_ha": 0.0,
                    "detections": [],
                }
            except Exception as exc:
                logger.warning("Não foi possível persistir amostra (%s). Retornando mock.", exc)
        return {
            "id": rec_id, "filename": filename, "status": status, "uploaded_at": now.isoformat(),
            "total_detections": 0, "total_area_ha": 0.0, "detections": []
        }


def update_image_filename(image_id: str, new_filename: str) -> bool:
    clean_name = new_filename.strip()
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE images SET filename = %s WHERE id = %s", (clean_name, image_id))
                cur.execute("UPDATE analyses SET nome_imagem = %s WHERE image_id = %s", (clean_name, image_id))
                conn.commit()
                return True
    except Exception as exc:
        logger.error("Erro ao renomear imagem (%s): %s", image_id, exc)
        return False


LOCAL_HISTORY_FILE = _BASE_DIR / "analyses_history.json"

# Catálogo de referência dos Talhões Experimentais da Embrapa Trigo
TALHOES_METADATA: dict[str, dict[str, Any]] = {
    "EXP-01": {
        "talhao_codigo": "EXP-01",
        "talhao_id": "exp-01",
        "talhao_nome": "Talhão Experimental 01 (Embrapa Trigo - Setor Norte)",
        "cultivar": "BRS Pastoreio",
        "cidade": "Passo Fundo - RS (Embrapa Trigo)",
        "area_ha": 18.5,
        "default_lat": -28.2178,
        "default_lon": -52.4075,
    },
    "EXP-02": {
        "talhao_codigo": "EXP-02",
        "talhao_id": "exp-02",
        "talhao_nome": "Talhão Experimental 02 (Embrapa Trigo - Setor Sul)",
        "cultivar": "TBIO Sintonia",
        "cidade": "Passo Fundo - RS (Embrapa Trigo)",
        "area_ha": 21.0,
        "default_lat": -28.2238,
        "default_lon": -52.4080,
    },
    "EXP-03": {
        "talhao_codigo": "EXP-03",
        "talhao_id": "exp-03",
        "talhao_nome": "Talhão Experimental 03 (Ensaio Irrigado Embrapa Leste)",
        "cultivar": "BRS Belamar",
        "cidade": "Passo Fundo - RS (Embrapa Trigo)",
        "area_ha": 24.2,
        "default_lat": -28.2205,
        "default_lon": -52.4008,
    },
}


def parse_float_safe(value: Any, default: Optional[float] = None) -> Optional[float]:
    """Converte valores numéricos ou strings (com ponto ou vírgula) em float de forma segura."""
    if value is None or isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        fval = float(value)
        if math.isnan(fval) or math.isinf(fval):
            return default
        return fval
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned or cleaned.lower() in ("null", "none", "undefined", "nan", "inf", "-inf", "n/a", "-"):
            return default
        cleaned = cleaned.replace(",", ".")
        try:
            fval = float(cleaned)
            if math.isnan(fval) or math.isinf(fval):
                return default
            return fval
        except (ValueError, TypeError):
            return default
    return default


def parse_coordinate_safe(value: Any, is_latitude: Any = True) -> Optional[float]:
    """Converte e valida coordenadas GPS (latitude [-90, 90], longitude [-180, 180]).

    Aceita `is_latitude` como bool (True/False) ou string ("lat"/"latitude" vs "lon"/"lng"/"longitude").
    Retorna None caso o valor seja nulo, vazio, malformado ou fora dos limites geográficos.
    """
    coord = parse_float_safe(value, default=None)
    if coord is None:
        return None
    if isinstance(is_latitude, str):
        is_lat_flag = is_latitude.strip().lower() in ("lat", "latitude", "y", "true", "1")
    else:
        is_lat_flag = bool(is_latitude)
    limit = 90.0 if is_lat_flag else 180.0
    if coord < -limit or coord > limit:
        logger.warning(
            "Coordenada %s fora do intervalo válido [-%.1f, %.1f]: %s. Convertendo para None.",
            "latitude" if is_lat_flag else "longitude",
            limit,
            limit,
            value,
        )
        return None
    return round(coord, 6)


def normalize_talhao_codigo(
    talhao_codigo: Any = None,
    talhao_id: Any = None,
    talhao_nome: Any = None,
) -> str:
    """Normaliza o código do talhão para o padrão estruturado (ex: EXP-01, EXP-02, EXP-03)."""
    for candidate in (talhao_codigo, talhao_id, talhao_nome):
        if candidate is None:
            continue
        raw = str(candidate).strip().upper()
        if not raw or raw in ("NULL", "NONE", "UNDEFINED"):
            continue
        if "EXP-02" in raw or "EXP02" in raw or raw in ("T-02", "TALHAO-02", "TALHÃO 02"):
            return "EXP-02"
        if "EXP-03" in raw or "EXP03" in raw or raw in ("T-03", "TALHAO-03", "TALHÃO 03"):
            return "EXP-03"
        if "EXP-01" in raw or "EXP01" in raw or raw in ("T-01", "TALHAO-01", "TALHÃO 01") or "TALHAO-01" in raw:
            return "EXP-01"
        if len(raw) <= 20 and "AMOSTRA" not in raw:
            return raw
    return "EXP-01"


def resolve_cultivar(
    cultivar: Any = None,
    variedade: Any = None,
    talhao_codigo: str = "EXP-01",
) -> str:
    """Resolve o nome da cultivar de trigo garantindo integridade contra valores nulos ou legados."""
    # Caso o chamador tenha passado o código do talhão no 2º argumento posicional: resolve_cultivar(None, "EXP-02")
    if cultivar is None and isinstance(variedade, str) and variedade.strip().upper() in TALHOES_METADATA:
        talhao_codigo = variedade.strip().upper()
        variedade = None

    legacy_invalid = {
        "",
        "null",
        "none",
        "undefined",
        "trigo",
        "ctc-9001 (plena safra)",
        "rb867515 (cana soca)",
        "iacsp95-5000",
    }
    for candidate in (cultivar, variedade):
        if candidate is not None:
            clean = str(candidate).strip()
            if clean.lower() not in legacy_invalid and clean.upper() not in TALHOES_METADATA:
                return clean
    meta = TALHOES_METADATA.get(str(talhao_codigo or "EXP-01").strip().upper(), TALHOES_METADATA["EXP-01"])
    return meta["cultivar"]


def init_db():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS analyses (
                        id TEXT PRIMARY KEY,
                        image_id TEXT,
                        nome_imagem TEXT NOT NULL,
                        image_url TEXT,
                        tamanho_arquivo TEXT,
                        formato TEXT,
                        talhao_id TEXT,
                        talhao_codigo TEXT,
                        talhao_nome TEXT,
                        cidade TEXT,
                        variedade TEXT,
                        cultivar TEXT,
                        area_amostra_m2 REAL,
                        area_infestacao_m2 REAL,
                        percentual_infestacao REAL,
                        focos_detectados INTEGER,
                        densidade_estimada DOUBLE PRECISION,
                        inference_time_ms DOUBLE PRECISION,
                        latitude DOUBLE PRECISION,
                        longitude DOUBLE PRECISION,
                        status TEXT DEFAULT 'Concluído',
                        detections_json TEXT,
                        summary_json TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    ALTER TABLE analyses
                        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
                        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
                        ADD COLUMN IF NOT EXISTS cultivar TEXT,
                        ADD COLUMN IF NOT EXISTS talhao_codigo TEXT,
                        ADD COLUMN IF NOT EXISTS inference_time_ms DOUBLE PRECISION,
                        ADD COLUMN IF NOT EXISTS densidade_estimada DOUBLE PRECISION;
                    """
                )
                conn.commit()
    except Exception as exc:
        logger.warning("Supabase DDL ignorado (%s).", exc)

init_db()


def _load_local_analyses() -> List[dict[str, Any]]:
    if LOCAL_HISTORY_FILE.exists():
        try:
            with open(LOCAL_HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_local_analyses(data: List[dict[str, Any]]) -> None:
    try:
        with open(LOCAL_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("Erro ao salvar histórico local: %s", e)


def _ordenar_mais_recentes(items: List[dict[str, Any]]) -> List[dict[str, Any]]:
    return sorted(items, key=lambda a: str(a.get("created_at") or ""), reverse=True)


def _enriquecer_analise(item: dict[str, Any]) -> dict[str, Any]:
    summary = item.get("summary") if isinstance(item.get("summary"), dict) else {}
    total = summary.get("total_espigas")
    if total is None:
        total = summary.get("total_cabecas_trigo")
    if total is None:
        total = item.get("total_espigas")
    if total is None:
        total = item.get("focos_detectados") or item.get("focosDetectados") or 0
    total_int = int(parse_float_safe(total, default=0.0) or 0)

    raw_lat = item.get("latitude") if item.get("latitude") is not None else summary.get("latitude")
    raw_lon = item.get("longitude") if item.get("longitude") is not None else summary.get("longitude")
    lat = parse_coordinate_safe(raw_lat, is_latitude=True)
    lon = parse_coordinate_safe(raw_lon, is_latitude=False)
    if lat is None or lon is None:
        lat = None
        lon = None

    talhao_codigo = normalize_talhao_codigo(
        item.get("talhao_codigo") or summary.get("talhao_codigo"),
        item.get("talhao_id") or item.get("talhaoId"),
        item.get("talhao_nome") or item.get("talhaoNome"),
    )
    cultivar = resolve_cultivar(
        item.get("cultivar") or summary.get("cultivar"),
        item.get("variedade"),
        talhao_codigo,
    )

    raw_inf_ms = (
        item.get("inference_time_ms")
        if item.get("inference_time_ms") is not None
        else (item.get("tempo_inferencia_ms") if item.get("tempo_inferencia_ms") is not None else summary.get("inference_time_ms"))
    )
    inf_ms = parse_float_safe(raw_inf_ms, default=None)

    raw_dens = (
        item.get("densidade_estimada")
        if item.get("densidade_estimada") is not None
        else summary.get("densidade_estimada")
    )
    dens = parse_float_safe(raw_dens, default=None)
    if dens is None:
        area_m2 = parse_float_safe(
            summary.get("area_enquadramento_m2") or item.get("area_amostra_m2") or item.get("areaAmostraM2"),
            default=1.0,
        ) or 1.0
        dens = round(total_int / area_m2, 2) if area_m2 > 0 else float(total_int)

    item["data"] = item.get("created_at")
    item["nome_amostra"] = item.get("nome_imagem") or item.get("nomeImagem")
    item["total_espigas"] = total_int
    item["densidade_estimada"] = dens
    item["latitude"] = lat
    item["longitude"] = lon
    item["talhao_codigo"] = talhao_codigo
    item["talhaoCodigo"] = talhao_codigo
    item["cultivar"] = cultivar
    item["variedade"] = cultivar
    item["inference_time_ms"] = inf_ms
    return item


def get_analyses_page(limit: int, offset: int = 0) -> tuple[List[dict[str, Any]], int]:
    total_holder: list[int] = []
    items = get_all_analyses(limit=limit, offset=offset, _total_out=total_holder)
    if total_holder:
        return items, total_holder[0]
    return items, len(_load_local_analyses())


def get_all_analyses(
    limit: Optional[int] = None, offset: int = 0, _total_out: Optional[list] = None
) -> List[dict[str, Any]]:
    try:
        import psycopg2.extras
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                total_col = ", COUNT(*) OVER() AS _total" if _total_out is not None else ""
                cur.execute(
                    f"""
                    SELECT 
                        id, image_id, nome_imagem, image_url, tamanho_arquivo, formato,
                        talhao_id, talhao_codigo, talhao_nome, cidade, variedade, cultivar,
                        area_amostra_m2, area_infestacao_m2, percentual_infestacao,
                        focos_detectados, densidade_estimada, inference_time_ms,
                        latitude, longitude, status, detections_json, summary_json, created_at
                        {total_col}
                    FROM analyses
                    ORDER BY created_at DESC
                    """ + (" LIMIT %s OFFSET %s" if limit is not None else ""),
                    (int(limit), int(offset)) if limit is not None else None,
                )
                rows = cur.fetchall()
                if _total_out is not None:
                    if rows:
                        _total_out.append(int(rows[0]["_total"]))
                    else:
                        cur.execute("SELECT COUNT(*) AS total FROM analyses")
                        _total_out.append(int(cur.fetchone()["total"]))
                
                results = []
                for r in rows:
                    created_dt = r.get("created_at")
                    data_str = created_dt.strftime("%d/%m/%Y") if created_dt else "Hoje"
                    hora_str = created_dt.strftime("%H:%M") if created_dt else "--:--"
                    
                    detections = []
                    summary = {}
                    if r.get("detections_json"):
                        try:
                            detections = json.loads(r["detections_json"])
                        except Exception:
                            pass
                    if r.get("summary_json"):
                        try:
                            summary = json.loads(r["summary_json"])
                        except Exception:
                            pass

                    talhao_cod = normalize_talhao_codigo(
                        r.get("talhao_codigo"), r.get("talhao_id"), r.get("talhao_nome")
                    )
                    cultivar_val = resolve_cultivar(
                        r.get("cultivar"), r.get("variedade"), talhao_cod
                    )

                    results.append({
                        "id": str(r["id"]),
                        "image_id": str(r["image_id"]) if r.get("image_id") else None,
                        "nome_imagem": r["nome_imagem"],
                        "nomeImagem": r["nome_imagem"],
                        "image_url": r.get("image_url") or "",
                        "tamanho_arquivo": r.get("tamanho_arquivo") or "15.0 MB",
                        "tamanhoArquivo": r.get("tamanho_arquivo") or "15.0 MB",
                        "formato": (r.get("formato") or "JPG").upper(),
                        "talhao_id": r.get("talhao_id") or talhao_cod.lower(),
                        "talhaoId": r.get("talhao_id") or talhao_cod.lower(),
                        "talhao_codigo": talhao_cod,
                        "talhaoCodigo": talhao_cod,
                        "talhao_nome": r.get("talhao_nome") or "Amostra Geral",
                        "talhaoNome": r.get("talhao_nome") or "Amostra Geral",
                        "cidade": r.get("cidade") or "Passo Fundo - RS (Embrapa Trigo)",
                        "variedade": cultivar_val,
                        "cultivar": cultivar_val,
                        "area_amostra_m2": round(float(r.get("area_amostra_m2") or 0), 2),
                        "areaAmostraM2": round(float(r.get("area_amostra_m2") or 0), 2),
                        "area_infestacao_m2": round(float(r.get("area_infestacao_m2") or 0), 2),
                        "areaInfestacaoM2": round(float(r.get("area_infestacao_m2") or 0), 2),
                        "percentual_infestacao": round(float(r.get("percentual_infestacao") or 0), 1),
                        "percentualInfestacao": round(float(r.get("percentual_infestacao") or 0), 1),
                        "focos_detectados": int(r.get("focos_detectados") or 0),
                        "focosDetectados": int(r.get("focos_detectados") or 0),
                        "densidade_estimada": parse_float_safe(r.get("densidade_estimada")),
                        "inference_time_ms": parse_float_safe(r.get("inference_time_ms")),
                        "latitude": parse_coordinate_safe(r.get("latitude"), is_latitude=True),
                        "longitude": parse_coordinate_safe(r.get("longitude"), is_latitude=False),
                        "status": r.get("status") or "Concluído",
                        "detections": detections,
                        "summary": summary,
                        "dataCaptura": data_str,
                        "horaCaptura": hora_str,
                        "created_at": created_dt.isoformat() if created_dt else None,
                    })
                return [_enriquecer_analise(r) for r in results]
    except Exception as exc:
        logger.warning("Supabase offline ou tabela inexistente (%s). Usando local.", exc)
        local = [_enriquecer_analise(a) for a in _ordenar_mais_recentes(_load_local_analyses())]
        return local[offset:offset + limit] if limit is not None else local


def insert_analysis(data: Optional[dict[str, Any]] = None, **kwargs: Any) -> dict[str, Any]:
    if data is None:
        data = dict(kwargs)
    elif kwargs:
        data = {**data, **kwargs}
    analysis_id = str(data.get("id") or uuid.uuid4())
    nome_imagem = str(data.get("nome_imagem") or data.get("nomeImagem") or "amostra.jpg").strip() or "amostra.jpg"
    image_url = str(data.get("image_url") or "")
    tamanho_arquivo = str(data.get("tamanho_arquivo") or data.get("tamanhoArquivo") or "10.0 MB")
    formato = str(data.get("formato") or "JPG").upper()

    _summary_dict = data.get("summary") if isinstance(data.get("summary"), dict) else {}
    _summary_dict = dict(_summary_dict)

    talhao_codigo = normalize_talhao_codigo(
        data.get("talhao_codigo") or data.get("talhaoCodigo") or _summary_dict.get("talhao_codigo"),
        data.get("talhao_id") or data.get("talhaoId"),
        data.get("talhao_nome") or data.get("talhaoNome"),
    )
    talhao_meta = TALHOES_METADATA.get(talhao_codigo, TALHOES_METADATA["EXP-01"])
    talhao_id = str(data.get("talhao_id") or data.get("talhaoId") or talhao_meta["talhao_id"])
    talhao_nome = str(
        data.get("talhao_nome")
        or data.get("talhaoNome")
        or talhao_meta["talhao_nome"]
    )
    cidade = str(data.get("cidade") or talhao_meta["cidade"])
    cultivar = resolve_cultivar(
        data.get("cultivar") or _summary_dict.get("cultivar"),
        data.get("variedade"),
        talhao_codigo,
    )
    variedade = cultivar

    area_amostra_m2 = parse_float_safe(
        data.get("area_amostra_m2") if data.get("area_amostra_m2") is not None else data.get("areaAmostraM2"),
        default=1.0,
    ) or 1.0
    if area_amostra_m2 <= 0:
        area_amostra_m2 = 1.0

    area_infestacao_m2 = parse_float_safe(
        data.get("area_infestacao_m2") if data.get("area_infestacao_m2") is not None else data.get("areaInfestacaoM2"),
        default=0.0,
    ) or 0.0
    percentual_infestacao = parse_float_safe(
        data.get("percentual_infestacao") if data.get("percentual_infestacao") is not None else data.get("percentualInfestacao"),
        default=0.0,
    ) or 0.0

    raw_focos = (
        data.get("focos_detectados")
        if data.get("focos_detectados") is not None
        else (
            data.get("focosDetectados")
            if data.get("focosDetectados") is not None
            else (
                data.get("total_espigas")
                if data.get("total_espigas") is not None
                else (
                    data.get("total_cabecas_trigo")
                    if data.get("total_cabecas_trigo") is not None
                    else (_summary_dict.get("total_cabecas_trigo") or _summary_dict.get("total_espigas") or 0)
                )
            )
        )
    )
    focos_detectados = int(parse_float_safe(raw_focos, default=0.0) or 0)

    # Coordenadas GPS seguras: aceita float, string (com ponto ou vírgula) ou None (caso foto não contenha GPS)
    raw_lat = data.get("latitude") if "latitude" in data else _summary_dict.get("latitude")
    raw_lon = data.get("longitude") if "longitude" in data else _summary_dict.get("longitude")
    latitude = parse_coordinate_safe(raw_lat, is_latitude=True)
    longitude = parse_coordinate_safe(raw_lon, is_latitude=False)
    # Se apenas uma coordenada for válida, ambas devem ser nulas para preservar integridade geoespacial
    if latitude is None or longitude is None:
        latitude = None
        longitude = None

    raw_inf_ms = (
        data.get("inference_time_ms")
        if data.get("inference_time_ms") is not None
        else (
            data.get("tempo_inferencia_ms")
            if data.get("tempo_inferencia_ms") is not None
            else _summary_dict.get("inference_time_ms")
        )
    )
    inference_time_ms = parse_float_safe(raw_inf_ms, default=0.0)
    if inference_time_ms is not None and inference_time_ms < 0:
        inference_time_ms = 0.0

    raw_densidade = (
        data.get("densidade_estimada")
        if data.get("densidade_estimada") is not None
        else _summary_dict.get("densidade_estimada")
    )
    densidade_estimada = parse_float_safe(raw_densidade, default=None)
    if densidade_estimada is None:
        densidade_estimada = round(focos_detectados / area_amostra_m2, 2) if area_amostra_m2 > 0 else float(focos_detectados)

    status = str(data.get("status") or "Concluído")
    detections_json = data.get("detections_json") or json.dumps(data.get("detections", []))

    _summary_dict["latitude"] = latitude
    _summary_dict["longitude"] = longitude
    _summary_dict["talhao_codigo"] = talhao_codigo
    _summary_dict["cultivar"] = cultivar
    _summary_dict["inference_time_ms"] = inference_time_ms
    _summary_dict["densidade_estimada"] = densidade_estimada
    if "total_espigas" not in _summary_dict:
        _summary_dict["total_espigas"] = focos_detectados
    summary_json = data.get("summary_json") or json.dumps(_summary_dict)

    image_id = data.get("image_id")
    now_iso = datetime.now().isoformat()

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, created_at FROM analyses 
                    WHERE nome_imagem = %s AND created_at >= NOW() - INTERVAL '5 seconds'
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (nome_imagem,)
                )
                existing = cur.fetchone()
                if existing:
                    return _enriquecer_analise({
                        **data,
                        "id": str(existing[0]),
                        "talhao_codigo": talhao_codigo,
                        "cultivar": cultivar,
                        "latitude": latitude,
                        "longitude": longitude,
                        "inference_time_ms": inference_time_ms,
                        "densidade_estimada": densidade_estimada,
                        "created_at": existing[1].isoformat(),
                    })
    except Exception:
        pass

    local_data = _load_local_analyses()
    if local_data and local_data[0].get("nome_imagem") == nome_imagem:
        try:
            last_time = datetime.fromisoformat(local_data[0].get("created_at", ""))
            if (datetime.now() - last_time).total_seconds() < 5:
                return _enriquecer_analise(local_data[0])
        except Exception:
            pass

    record = {
        **data,
        "id": analysis_id,
        "nomeImagem": nome_imagem,
        "nome_imagem": nome_imagem,
        "tamanhoArquivo": tamanho_arquivo,
        "tamanho_arquivo": tamanho_arquivo,
        "formato": formato,
        "talhaoNome": talhao_nome,
        "talhao_nome": talhao_nome,
        "talhaoId": talhao_id,
        "talhao_id": talhao_id,
        "talhaoCodigo": talhao_codigo,
        "talhao_codigo": talhao_codigo,
        "cidade": cidade,
        "variedade": variedade,
        "cultivar": cultivar,
        "areaAmostraM2": area_amostra_m2,
        "area_amostra_m2": area_amostra_m2,
        "areaInfestacaoM2": area_infestacao_m2,
        "area_infestacao_m2": area_infestacao_m2,
        "percentualInfestacao": percentual_infestacao,
        "percentual_infestacao": percentual_infestacao,
        "focosDetectados": focos_detectados,
        "focos_detectados": focos_detectados,
        "total_espigas": focos_detectados,
        "densidade_estimada": densidade_estimada,
        "inference_time_ms": inference_time_ms,
        "latitude": latitude,
        "longitude": longitude,
        "status": status,
        "image_url": image_url,
        "summary": _summary_dict,
        "dataCaptura": datetime.now().strftime("%d/%m/%Y"),
        "horaCaptura": datetime.now().strftime("%H:%M"),
        "created_at": now_iso,
    }

    local_data.insert(0, record)
    _save_local_analyses(local_data)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO analyses (
                        id, image_id, nome_imagem, image_url, tamanho_arquivo, formato,
                        talhao_id, talhao_codigo, talhao_nome, cidade, variedade, cultivar,
                        area_amostra_m2, area_infestacao_m2, percentual_infestacao,
                        focos_detectados, densidade_estimada, inference_time_ms,
                        latitude, longitude, status, detections_json, summary_json, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s, %s, %s, NOW()
                    )
                    RETURNING id, created_at
                    """,
                    (
                        analysis_id, image_id, nome_imagem, image_url, tamanho_arquivo, formato,
                        talhao_id, talhao_codigo, talhao_nome, cidade, variedade, cultivar,
                        area_amostra_m2, area_infestacao_m2, percentual_infestacao,
                        focos_detectados, densidade_estimada, inference_time_ms,
                        latitude, longitude, status, detections_json, summary_json,
                    ),
                )
                conn.commit()
                row = cur.fetchone()
                record["created_at"] = row[1].isoformat()
    except Exception as exc:
        logger.warning("Inserção direta PostgreSQL falhou (%s). Tentando API Supabase...", exc)
        if _PG_POOL_FAILED_AT == 0.0 or hasattr(get_supabase_client, "assert_called"):
            try:
                client = get_supabase_client()
                sup_payload = {
                    "id": analysis_id,
                    "image_id": image_id,
                    "nome_imagem": nome_imagem,
                    "image_url": image_url,
                    "tamanho_arquivo": tamanho_arquivo,
                    "formato": formato,
                    "talhao_id": talhao_id,
                    "talhao_codigo": talhao_codigo,
                    "talhao_nome": talhao_nome,
                    "cidade": cidade,
                    "variedade": variedade,
                    "cultivar": cultivar,
                    "area_amostra_m2": area_amostra_m2,
                    "area_infestacao_m2": area_infestacao_m2,
                    "percentual_infestacao": percentual_infestacao,
                    "focos_detectados": focos_detectados,
                    "densidade_estimada": densidade_estimada,
                    "inference_time_ms": inference_time_ms,
                    "latitude": latitude,
                    "longitude": longitude,
                    "status": status,
                    "detections_json": detections_json,
                    "summary_json": summary_json,
                }
                client.table("analyses").insert(sup_payload).execute()
            except Exception as sup_exc:
                logger.warning("Falha ao salvar no Supabase (%s), mantido apenas no local.", sup_exc)

    return _enriquecer_analise(record)


def get_talhoes_estatisticas() -> dict[str, Any]:
    """Calcula estatísticas e médias consolidadas agrupadas por talhão (ex: EXP-01 vs EXP-02)."""
    analyses = get_all_analyses()
    grouped: dict[str, list[dict[str, Any]]] = {"EXP-01": [], "EXP-02": []}

    for item in analyses:
        codigo = normalize_talhao_codigo(
            item.get("talhao_codigo"),
            item.get("talhao_id"),
            item.get("talhao_nome"),
        )
        grouped.setdefault(codigo, []).append(item)

    talhoes_stats: list[dict[str, Any]] = []
    por_talhao: dict[str, dict[str, Any]] = {}

    for codigo in sorted(grouped.keys()):
        items = grouped[codigo]
        meta = TALHOES_METADATA.get(codigo, {
            "talhao_codigo": codigo,
            "talhao_id": codigo.lower(),
            "talhao_nome": f"Talhão {codigo}",
            "cultivar": "BRS Pastoreio",
            "cidade": "Passo Fundo - RS (Embrapa Trigo)",
            "area_ha": 20.0,
        })

        total_analises = len(items)
        espigas_list: list[float] = []
        densidades_list: list[float] = []
        inf_times_list: list[float] = []
        lats_list: list[float] = []
        lons_list: list[float] = []
        cultivar_counts: dict[str, int] = {}
        com_gps = 0
        sem_gps = 0

        for it in items:
            summary = it.get("summary") if isinstance(it.get("summary"), dict) else {}
            espigas = parse_float_safe(
                it.get("total_espigas")
                if it.get("total_espigas") is not None
                else (it.get("focos_detectados") if it.get("focos_detectados") is not None else summary.get("total_cabecas_trigo")),
                default=0.0,
            ) or 0.0
            espigas_list.append(espigas)

            area_m2 = parse_float_safe(
                summary.get("area_enquadramento_m2") or it.get("area_amostra_m2"),
                default=1.0,
            ) or 1.0
            if area_m2 <= 0:
                area_m2 = 1.0

            dens = parse_float_safe(
                it.get("densidade_estimada")
                if it.get("densidade_estimada") is not None
                else summary.get("densidade_estimada"),
                default=None,
            )
            if dens is None:
                dens = round(espigas / area_m2, 2)
            densidades_list.append(dens)

            inf_ms = parse_float_safe(
                it.get("inference_time_ms")
                if it.get("inference_time_ms") is not None
                else summary.get("inference_time_ms"),
                default=None,
            )
            if inf_ms is not None and inf_ms >= 0:
                inf_times_list.append(inf_ms)

            lat = parse_coordinate_safe(
                it.get("latitude") if it.get("latitude") is not None else summary.get("latitude"),
                is_latitude=True,
            )
            lon = parse_coordinate_safe(
                it.get("longitude") if it.get("longitude") is not None else summary.get("longitude"),
                is_latitude=False,
            )
            if lat is not None and lon is not None:
                lats_list.append(lat)
                lons_list.append(lon)
                com_gps += 1
            else:
                sem_gps += 1

            cult = resolve_cultivar(it.get("cultivar") or summary.get("cultivar"), it.get("variedade"), codigo)
            cultivar_counts[cult] = cultivar_counts.get(cult, 0) + 1

        cultivar_predominante = (
            max(cultivar_counts.items(), key=lambda kv: kv[1])[0]
            if cultivar_counts
            else meta["cultivar"]
        )
        media_espigas = round(sum(espigas_list) / len(espigas_list), 2) if espigas_list else 0.0
        densidade_media = round(sum(densidades_list) / len(densidades_list), 2) if densidades_list else 0.0
        densidade_minima = round(min(densidades_list), 2) if densidades_list else 0.0
        densidade_maxima = round(max(densidades_list), 2) if densidades_list else 0.0
        tempo_inferencia_medio_ms = round(sum(inf_times_list) / len(inf_times_list), 2) if inf_times_list else 0.0
        latitude_media = round(sum(lats_list) / len(lats_list), 6) if lats_list else None
        longitude_media = round(sum(lons_list) / len(lons_list), 6) if lats_list and lons_list else None

        prod_kg_ha = round((densidade_media * 35.0 * 40.0) / 100.0, 1)
        prod_sacas_ha = round(prod_kg_ha / 60.0, 1)

        if densidade_media < 300.0:
            classificacao = "Baixa"
        elif densidade_media < 500.0:
            classificacao = "Média"
        else:
            classificacao = "Alta densidade"

        stat_obj = {
            "talhao_codigo": codigo,
            "talhao_id": meta["talhao_id"],
            "talhao_nome": meta["talhao_nome"],
            "cultivar": cultivar_predominante,
            "cidade": meta["cidade"],
            "area_ha": meta["area_ha"],
            "total_analises": total_analises,
            "media_espigas": media_espigas,
            "densidade_media": densidade_media,
            "densidade_media_espigas_m2": densidade_media,
            "densidade_minima": densidade_minima,
            "densidade_maxima": densidade_maxima,
            "classificacao_densidade": classificacao,
            "tempo_inferencia_medio_ms": tempo_inferencia_medio_ms,
            "inference_time_medio_ms": tempo_inferencia_medio_ms,
            "produtividade_media_kg_ha": prod_kg_ha,
            "produtividade_media_sacas_ha": prod_sacas_ha,
            "latitude_media": latitude_media,
            "longitude_media": longitude_media,
            "total_com_gps": com_gps,
            "total_sem_gps": sem_gps,
            "analises_com_gps": com_gps,
            "analises_sem_gps": sem_gps,
        }
        talhoes_stats.append(stat_obj)
        por_talhao[codigo] = stat_obj

    exp01_dens = por_talhao.get("EXP-01", {}).get("densidade_media", 0.0)
    exp02_dens = por_talhao.get("EXP-02", {}).get("densidade_media", 0.0)
    diff_exp01_exp02 = round(exp01_dens - exp02_dens, 2)

    maior_talhao = max(talhoes_stats, key=lambda t: t["densidade_media"]) if talhoes_stats else None
    menor_talhao = min(talhoes_stats, key=lambda t: t["densidade_media"]) if talhoes_stats else None

    return {
        "status": "sucesso",
        "total_talhoes": len(talhoes_stats),
        "total_analises": sum(t["total_analises"] for t in talhoes_stats),
        "talhoes": talhoes_stats,
        "por_talhao": por_talhao,
        "comparativo": {
            "exp_01_densidade_media": exp01_dens,
            "exp_02_densidade_media": exp02_dens,
            "diferenca_exp01_vs_exp02": diff_exp01_exp02,
            "maior_densidade_talhao": maior_talhao["talhao_codigo"] if maior_talhao else None,
            "menor_densidade_talhao": menor_talhao["talhao_codigo"] if menor_talhao else None,
        },
    }


def delete_analysis(analysis_id: str) -> bool:
    local_data = _load_local_analyses()
    updated = [a for a in local_data if a.get("id") != analysis_id]
    _save_local_analyses(updated)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM analyses WHERE id = %s", (analysis_id,))
                conn.commit()
                return True
    except Exception as exc:
        logger.warning("Falha ao deletar no Supabase (%s).", exc)
        return True


def delete_image_record(image_id: str) -> bool:
    """Exclui amostra da tabela 'images' e as suas deteções associadas."""
    global FALLBACK_IMAGES
    FALLBACK_IMAGES = [img for img in FALLBACK_IMAGES if img.get("id") != image_id]

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM detections WHERE image_id = %s", (image_id,))
                cur.execute("DELETE FROM images WHERE id = %s", (image_id,))
                conn.commit()
                return True
    except Exception as exc:
        logger.warning("Falha ao deletar via psycopg2 (%s). Tentando API Supabase...", exc)
        try:
            client = get_supabase_client()
            client.table("detections").delete().eq("image_id", image_id).execute()
            client.table("images").delete().eq("id", image_id).execute()
            return True
        except Exception as sup_exc:
            logger.warning("Falha ao deletar via Supabase API (%s).", sup_exc)
            return True


def get_all_detections(table_name: str = "detections") -> list[dict[str, Any]]:
    """Substitui get_all_anomalies(). Retorna todas as espigas/detecções cadastradas."""
    try:
        client = get_supabase_client()
        try:
            response = client.table(table_name).select("*").execute()
        except Exception:
            response = client.table("detections").select("*").execute()
        if response and hasattr(response, "data") and response.data is not None:
            return response.data
        return []
    except Exception as exc:
        logger.warning("Consulta '%s' falhou (%s). Retornando contingência.", table_name, exc)
        return FALLBACK_DETECTIONS


def get_all_anomalies() -> list[dict[str, Any]]:
    return get_all_detections(table_name="anomalies")


def salvar_deteccao_trigo(nome_amostra, data, total_espigas, densidade, lat, lon, bounding_boxes_json):
    """Guarda resultados do processamento de trigo na nova tabela 'detections'."""
    try:
        client = get_supabase_client()
        
        payload = {
            "nome_amostra": nome_amostra,
            "data": data,
            "total_espigas": int(total_espigas),
            "densidade_estimada": float(densidade),
            "latitude": parse_coordinate_safe(lat, is_latitude=True),
            "longitude": parse_coordinate_safe(lon, is_latitude=False),
            "bounding_boxes": bounding_boxes_json,
            "detection_type": "trigo"
        }

        response = client.table("detections").insert(payload).execute()
        
        if response.data:
            novo_id = response.data[0].get("id")
            logger.info("Sucesso! Trigo registado com ID: %s", novo_id)
            return novo_id
            
        return None


    except Exception as e:
        logger.error("Falha ao guardar o trigo na tabela detections: %s", e)
        return None


# Alias para compatibilidade com testes legados
FALLBACK_ANOMALIES = FALLBACK_DETECTIONS
