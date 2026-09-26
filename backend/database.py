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
    raw_pwd = DATABASE_PASSWORD or "Sug@rCarne67!"
    pwd = urllib.parse.quote_plus(raw_pwd)
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


def update_image_filename(image_id: str, new_filename: str) -> bool:
    """Atualiza o nome de exibição de uma imagem cadastrada na tabela 'images' do Supabase."""
    clean_name = new_filename.strip()
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE images SET filename = %s WHERE id = %s",
                    (clean_name, image_id),
                )
                cur.execute(
                    "UPDATE analyses SET nome_imagem = %s WHERE image_id = %s",
                    (clean_name, image_id),
                )
                conn.commit()
                logger.info("Amostra '%s' renomeada para '%s' no Supabase", image_id, clean_name)
                return True
    except Exception as exc:
        logger.error("Erro ao renomear imagem no banco (%s): %s", image_id, exc)
        return False


import json

# Arquivo de segurança local caso a conexão direta falhe sem o painel
LOCAL_HISTORY_FILE = _BASE_DIR / "analyses_history.json"


def init_db():
    """Tenta criar a tabela 'analyses' diretamente no banco via Python."""
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
                logger.info("Tabela 'analyses' verificada/criada com sucesso no Supabase!")
    except Exception as exc:
        logger.warning("Supabase não executou DDL direta (%s). Operando com contingência local.", exc)


# Executa a verificação assim que o módulo carregar
init_db()


def _load_local_analyses() -> List[dict[str, Any]]:
    """Carrega análises do arquivo local caso o banco esteja inacessível."""
    if LOCAL_HISTORY_FILE.exists():
        try:
            with open(LOCAL_HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_local_analyses(data: List[dict[str, Any]]) -> None:
    """Salva análises no arquivo local."""
    try:
        with open(LOCAL_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("Erro ao salvar histórico local: %s", e)


def get_all_analyses() -> List[dict[str, Any]]:
    """Consulta histórico no Supabase. Se falhar, busca do arquivo local seguro."""
    try:
        import psycopg2.extras
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT 
                        id, image_id, nome_imagem, image_url, tamanho_arquivo, formato,
                        talhao_id, talhao_nome, cidade, variedade,
                        area_amostra_m2, area_infestacao_m2, percentual_infestacao,
                        focos_detectados, status, detections_json, summary_json, created_at
                    FROM analyses
                    ORDER BY created_at DESC
                    """
                )
                rows = cur.fetchall()
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
                        "variedade": r.get("variedade") or "CTC-9001",
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
                return results
    except Exception as exc:
        logger.warning("Supabase offline ou tabela inexistente (%s). Usando contingência local.", exc)
        return _load_local_analyses()


def insert_analysis(data: dict[str, Any]) -> dict[str, Any]:
    """Salva análise no Supabase com trava anti-duplicação (evita registros gêmeos do React)."""
    analysis_id = data.get("id") or str(uuid.uuid4())
    nome_imagem = data.get("nome_imagem") or data.get("nomeImagem") or "amostra.jpg"
    image_url = data.get("image_url") or ""
    tamanho_arquivo = data.get("tamanho_arquivo") or data.get("tamanhoArquivo") or "10.0 MB"
    formato = (data.get("formato") or "JPG").upper()
    talhao_id = data.get("talhao_id") or data.get("talhaoId") or "talhao-01"
    talhao_nome = data.get("talhao_nome") or data.get("talhaoNome") or "Amostra de Campo"
    cidade = data.get("cidade") or "Rio Claro - SP"
    variedade = data.get("variedade") or "CTC-9001"
    area_amostra_m2 = float(data.get("area_amostra_m2") or data.get("areaAmostraM2") or 2.5)
    area_infestacao_m2 = float(data.get("area_infestacao_m2") or data.get("areaInfestacaoM2") or 0.0)
    percentual_infestacao = float(data.get("percentual_infestacao") or data.get("percentualInfestacao") or 0.0)
    focos_detectados = int(data.get("focos_detectados") or data.get("focosDetectados") or 0)
    status = data.get("status") or "Concluído"
    detections_json = data.get("detections_json") or json.dumps(data.get("detections", []))
    summary_json = data.get("summary_json") or json.dumps(data.get("summary", {}))
    image_id = data.get("image_id")
    now_iso = datetime.now().isoformat()

    # -------------------------------------------------------------
    # TRAVA ANTI-DUPLICAÇÃO: Verifica se já existe análise idêntica
    # criada há menos de 5 segundos no Supabase
    # -------------------------------------------------------------
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
                    logger.info("Análise duplicada ignorada (duplo disparo em < 5s): %s", nome_imagem)
                    return {**data, "id": str(existing[0]), "created_at": existing[1].isoformat()}
    except Exception:
        pass

    # Checagem na contingência local também
    local_data = _load_local_analyses()
    if local_data and local_data[0].get("nome_imagem") == nome_imagem:
        try:
            last_time = datetime.fromisoformat(local_data[0].get("created_at", ""))
            if (datetime.now() - last_time).total_seconds() < 5:
                logger.info("Análise duplicada ignorada no backup local: %s", nome_imagem)
                return local_data[0]
        except Exception:
            pass

    record = {
        **data,
        "id": analysis_id,
        "nomeImagem": nome_imagem,
        "nome_imagem": nome_imagem,
        "tamanhoArquivo": tamanho_arquivo,
        "formato": formato,
        "talhaoNome": talhao_nome,
        "talhaoId": talhao_id,
        "cidade": cidade,
        "variedade": variedade,
        "areaAmostraM2": area_amostra_m2,
        "areaInfestacaoM2": area_infestacao_m2,
        "percentualInfestacao": percentual_infestacao,
        "focosDetectados": focos_detectados,
        "status": status,
        "image_url": image_url,
        "dataCaptura": datetime.now().strftime("%d/%m/%Y"),
        "horaCaptura": datetime.now().strftime("%H:%M"),
        "created_at": now_iso,
    }

    # Salva na cópia local
    local_data.insert(0, record)
    _save_local_analyses(local_data)

    # Persiste no Supabase
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
                logger.info("Análise gravada uma única vez no Supabase: %s", nome_imagem)
    except Exception as exc:
        logger.warning("Falha ao salvar no Supabase (%s), mantido apenas no local.", exc)

    return record


def delete_analysis(analysis_id: str) -> bool:
    """Exclui análise do Supabase e do arquivo local."""
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
        logger.warning("Falha ao deletar no Supabase (%s), excluído apenas localmente.", exc)
        return True


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
