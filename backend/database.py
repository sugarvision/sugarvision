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

        client: Client = create_client(SUPABASE_URL.strip(), effective_key)
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
_conn_last_used: dict[int, float] = {}


def _get_pg_pool(psycopg2_module: Any) -> Any:
    """Cria (uma única vez) o pool de conexões PostgreSQL reutilizáveis."""
    global _PG_POOL
    if _PG_POOL is None:
        with _PG_POOL_LOCK:
            if _PG_POOL is None:
                from psycopg2.pool import ThreadedConnectionPool

                _PG_POOL = ThreadedConnectionPool(
                    1, 5, get_pg_connection_string(), connect_timeout=5
                )
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
                        "total_area_ha": round(float(row["total_area_ha"]), 2),
                        "detections": [], 
                    })

                logger.info("SELECT executado com sucesso na tabela 'images': %d registros retornados.", len(results))
                return results

    except Exception as exc:
        logger.warning("Consulta PostgreSQL 'images' indisponível (%s). Tentando API Supabase...", exc)
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


import json

LOCAL_HISTORY_FILE = _BASE_DIR / "analyses_history.json"


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
                        talhao_nome TEXT,
                        cidade TEXT,
                        variedade TEXT,
                        area_amostra_m2 REAL,
                        area_infestacao_m2 REAL,
                        percentual_infestacao REAL,
                        focos_detectados INTEGER,
                        status TEXT DEFAULT 'Concluído',
                        detections_json TEXT,
                        summary_json TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
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
        total = item.get("total_espigas")
    if total is None:
        total = item.get("focos_detectados") or item.get("focosDetectados") or 0
    lat = item.get("latitude") if item.get("latitude") is not None else summary.get("latitude")
    lon = item.get("longitude") if item.get("longitude") is not None else summary.get("longitude")
    
    item["data"] = item.get("created_at")
    item["nome_amostra"] = item.get("nome_imagem") or item.get("nomeImagem")
    item["total_espigas"] = int(total)
    item["densidade_estimada"] = summary.get("densidade_estimada", item.get("densidade_estimada"))
    item["latitude"] = float(lat) if lat is not None else None
    item["longitude"] = float(lon) if lon is not None else None
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
                        talhao_id, talhao_nome, cidade, variedade,
                        area_amostra_m2, area_infestacao_m2, percentual_infestacao,
                        focos_detectados, status, detections_json, summary_json, created_at
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

                    results.append({
                        "id": str(r["id"]),
                        "image_id": str(r["image_id"]) if r.get("image_id") else None,
                        "nome_imagem": r["nome_imagem"],
                        "nomeImagem": r["nome_imagem"],
                        "image_url": r.get("image_url") or "",
                        "tamanho_arquivo": r.get("tamanho_arquivo") or "15.0 MB",
                        "tamanhoArquivo": r.get("tamanho_arquivo") or "15.0 MB",
                        "formato": (r.get("formato") or "JPG").upper(),
                        "talhao_id": r.get("talhao_id") or "talhao-01",
                        "talhaoId": r.get("talhao_id") or "talhao-01",
                        "talhao_nome": r.get("talhao_nome") or "Amostra Geral",
                        "talhaoNome": r.get("talhao_nome") or "Amostra Geral",
                        "cidade": r.get("cidade") or "Rio Claro - SP",
                        "variedade": r.get("variedade") or "Trigo",
                        "area_amostra_m2": round(float(r.get("area_amostra_m2") or 0), 2),
                        "areaAmostraM2": round(float(r.get("area_amostra_m2") or 0), 2),
                        "area_infestacao_m2": round(float(r.get("area_infestacao_m2") or 0), 2),
                        "areaInfestacaoM2": round(float(r.get("area_infestacao_m2") or 0), 2),
                        "percentual_infestacao": round(float(r.get("percentual_infestacao") or 0), 1),
                        "percentualInfestacao": round(float(r.get("percentual_infestacao") or 0), 1),
                        "focos_detectados": int(r.get("focos_detectados") or 0),
                        "focosDetectados": int(r.get("focos_detectados") or 0),
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


def insert_analysis(data: dict[str, Any]) -> dict[str, Any]:
    analysis_id = data.get("id") or str(uuid.uuid4())
    nome_imagem = data.get("nome_imagem") or data.get("nomeImagem") or "amostra.jpg"
    image_url = data.get("image_url") or ""
    tamanho_arquivo = data.get("tamanho_arquivo") or data.get("tamanhoArquivo") or "10.0 MB"
    formato = (data.get("formato") or "JPG").upper()
    talhao_id = data.get("talhao_id") or data.get("talhaoId") or "talhao-01"
    talhao_nome = data.get("talhao_nome") or data.get("talhaoNome") or "Amostra de Campo"
    cidade = data.get("cidade") or "Rio Claro - SP"
    variedade = data.get("variedade") or "Trigo"
    area_amostra_m2 = float(data.get("area_amostra_m2") or data.get("areaAmostraM2") or 2.5)
    area_infestacao_m2 = float(data.get("area_infestacao_m2") or data.get("areaInfestacaoM2") or 0.0)
    percentual_infestacao = float(data.get("percentual_infestacao") or data.get("percentualInfestacao") or 0.0)
    focos_detectados = int(data.get("focos_detectados") or data.get("focosDetectados") or 0)
    status = data.get("status") or "Concluído"
    detections_json = data.get("detections_json") or json.dumps(data.get("detections", []))
    
    _summary_dict = data.get("summary") if isinstance(data.get("summary"), dict) else {}
    _summary_dict = dict(_summary_dict)
    for _coord in ("latitude", "longitude"):
        if data.get(_coord) is not None and _summary_dict.get(_coord) is None:
            _summary_dict[_coord] = float(data[_coord])
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
                    return {**data, "id": str(existing[0]), "created_at": existing[1].isoformat()}
    except Exception:
        pass

    local_data = _load_local_analyses()
    if local_data and local_data[0].get("nome_imagem") == nome_imagem:
        try:
            last_time = datetime.fromisoformat(local_data[0].get("created_at", ""))
            if (datetime.now() - last_time).total_seconds() < 5:
                return local_data[0]
        except Exception:
            pass

    record = {
        **data,
        "id": analysis_id, "nomeImagem": nome_imagem, "nome_imagem": nome_imagem,
        "tamanhoArquivo": tamanho_arquivo, "formato": formato, "talhaoNome": talhao_nome,
        "talhaoId": talhao_id, "cidade": cidade, "variedade": variedade,
        "areaAmostraM2": area_amostra_m2, "areaInfestacaoM2": area_infestacao_m2,
        "percentualInfestacao": percentual_infestacao, "focosDetectados": focos_detectados,
        "status": status, "image_url": image_url, "dataCaptura": datetime.now().strftime("%d/%m/%Y"),
        "horaCaptura": datetime.now().strftime("%H:%M"), "created_at": now_iso,
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
                        talhao_id, talhao_nome, cidade, variedade,
                        area_amostra_m2, area_infestacao_m2, percentual_infestacao,
                        focos_detectados, status, detections_json, summary_json, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id, created_at
                    """,
                    (
                        analysis_id, image_id, nome_imagem, image_url, tamanho_arquivo, formato,
                        talhao_id, talhao_nome, cidade, variedade,
                        area_amostra_m2, area_infestacao_m2, percentual_infestacao,
                        focos_detectados, status, detections_json, summary_json
                    ),
                )
                conn.commit()
                row = cur.fetchone()
                record["created_at"] = row[1].isoformat()
    except Exception as exc:
        logger.warning("Falha ao salvar no Supabase (%s), mantido apenas no local.", exc)

    return record


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


def get_all_detections() -> list[dict[str, Any]]:
    """Substitui get_all_anomalies(). Retorna todas as espigas/detecções cadastradas."""
    try:
        client = get_supabase_client()
        response = client.table("detections").select("*").execute()
        if response and hasattr(response, "data") and response.data is not None:
            return response.data
        return []
    except Exception as exc:
        logger.warning("Consulta 'detections' falhou (%s). Retornando contingência.", exc)
        return FALLBACK_DETECTIONS


def salvar_deteccao_trigo(nome_amostra, data, total_espigas, densidade, lat, lon, bounding_boxes_json):
    """Guarda resultados do processamento de trigo na nova tabela 'detections'."""
    try:
        client = get_supabase_client()
        
        payload = {
            "nome_amostra": nome_amostra,
            "data": data,
            "total_espigas": int(total_espigas),
            "densidade_estimada": float(densidade),
            "latitude": float(lat) if lat is not None else None,
            "longitude": float(lon) if lon is not None else None,
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