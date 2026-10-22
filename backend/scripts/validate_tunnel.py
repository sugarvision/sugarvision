"""Validação da infraestrutura de túnel local (Sprint 9).

Uso:
    python scripts/validate_tunnel.py https://xxxx.trycloudflare.com [imagem.jpg] [--runs 3]

Verifica, através da URL pública (HTTPS):
  1. /health responde 200.
  2. Preflight CORS (OPTIONS /upload) autoriza a origem do frontend.
  3. N uploads consecutivos (padrão 3) em /upload: status 201, tempo de resposta
     e que `image_url` NÃO aponta para localhost/127.0.0.1 (senão a imagem quebra na Vercel).
  4. A imagem de `image_url` é baixável pelo túnel.

Se AUTH_ENABLED=True defina SUGARVISION_TOKEN com um JWT válido do Supabase.
Usa apenas a biblioteca padrão.
"""

import argparse
import json
import mimetypes
import os
import statistics
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_IMAGES = [
    BASE_DIR / "temp_images" / "cana_teste.jpg",
    BASE_DIR.parent / "cv_engine" / "cana_teste.jpg",
    BASE_DIR.parent / "cv_engine" / "amostra_erva_daninha.jpg",
]
ORIGIN = "https://sugarvision.vercel.app"
LOCAL_MARKERS = ("localhost", "127.0.0.1", "0.0.0.0")


def _auth_headers() -> dict:
    token = os.getenv("SUGARVISION_TOKEN")
    return {"Authorization": f"Bearer {token}"} if token else {}


def _request(req: urllib.request.Request, timeout: int = 180):
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as err:
        return err.code, dict(err.headers), err.read()


def _multipart(path: Path):
    boundary = uuid.uuid4().hex
    ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    # Nome único evita colisão com uploads anteriores.
    name = f"tunnel_{uuid.uuid4().hex[:8]}_{path.name}"
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{name}\"\r\n"
        f"Content-Type: {ctype}\r\n\r\n"
    ).encode() + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    return body, f"multipart/form-data; boundary={boundary}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("url", help="URL pública do túnel (https://...)")
    parser.add_argument("image", nargs="?", help="Imagem de teste (padrão: amostra do repositório)")
    parser.add_argument("--runs", type=int, default=3)
    args = parser.parse_args()

    base = args.url.rstrip("/")
    image = Path(args.image) if args.image else next((p for p in DEFAULT_IMAGES if p.exists()), None)
    if not base.startswith("https://"):
        print("FALHA: a URL do túnel deve ser HTTPS (a Vercel bloqueia mixed content).")
        return 1
    if not image or not image.exists():
        print("FALHA: nenhuma imagem de teste encontrada; informe o caminho.")
        return 1

    failures = []

    status, _, body = _request(urllib.request.Request(f"{base}/health"))
    print(f"[1] GET /health -> {status} {body[:120]!r}")
    if status != 200:
        failures.append("health")

    pre = urllib.request.Request(
        f"{base}/upload",
        method="OPTIONS",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    status, headers, _ = _request(pre)
    allow = {k.lower(): v for k, v in headers.items()}.get("access-control-allow-origin")
    print(f"[2] CORS preflight -> {status} allow-origin={allow}")
    if status != 200 or allow not in ("*", ORIGIN):
        failures.append("cors")

    times = []
    for i in range(1, args.runs + 1):
        data, ctype = _multipart(image)
        req = urllib.request.Request(
            f"{base}/upload", data=data, method="POST",
            headers={"Content-Type": ctype, **_auth_headers()},
        )
        t0 = time.perf_counter()
        status, _, raw = _request(req)
        elapsed = time.perf_counter() - t0
        times.append(elapsed)
        ok = status == 201
        info = ""
        if ok:
            payload = json.loads(raw)
            total = payload.get("summary", {}).get("total_detections", len(payload.get("detections", [])))
            image_url = (payload.get("history_record") or {}).get("image_url", "")
            local = any(m in image_url for m in LOCAL_MARKERS)
            info = f"detecções={total} image_url={image_url}"
            if local or not image_url:
                ok = False
                info += "  <-- image_url inválida para acesso externo (defina BASE_URL)"
            else:
                st_img, _, _ = _request(urllib.request.Request(image_url), timeout=60)
                info += f" (GET imagem -> {st_img})"
                ok = st_img == 200
        else:
            info = raw[:200].decode(errors="replace")
        print(f"[3.{i}] POST /upload -> {status} em {elapsed:.2f}s {info}")
        if not ok:
            failures.append(f"upload{i}")

    if times:
        print(
            f"Tempos: min={min(times):.2f}s média={statistics.mean(times):.2f}s "
            f"máx={max(times):.2f}s"
        )

    print("\nRESULTADO:", "OK" if not failures else f"FALHAS -> {failures}")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
