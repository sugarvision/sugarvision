"""Proteção JWT (Supabase) com modo de contingência controlado por AUTH_ENABLED.

A dependência `verify_token` valida o cabeçalho `Authorization: Bearer <token>`.
Se `AUTH_ENABLED=False` no `.env`, a validação é ignorada (rede de segurança para
apresentações/testes em caso de falha de sessão). A flag é lida a cada requisição,
permitindo alternar o modo sem alterar código.
"""

import logging
import os
from typing import Any, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger("sugarvision-api")

# auto_error=False: o tratamento do erro 401 é feito manualmente (respeitando AUTH_ENABLED)
_bearer_scheme = HTTPBearer(auto_error=False)

_TRUE_VALUES = {"1", "true", "yes", "on", "sim"}


def is_auth_enabled() -> bool:
    """Lê a flag AUTH_ENABLED do ambiente (padrão: True, ou seja, seguro por padrão)."""
    return os.getenv("AUTH_ENABLED", "True").strip().lower() in _TRUE_VALUES


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def decode_supabase_token(token: str) -> dict[str, Any]:
    """Valida assinatura e expiração do JWT emitido pelo Supabase (HS256)."""
    secret = os.getenv("SUPABASE_JWT_SECRET", "")
    if not secret:
        logger.error("SUPABASE_JWT_SECRET não configurado; impossível validar o token.")
        raise _unauthorized("Servidor sem segredo JWT configurado para validar o token.")
    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Token expirado.")
    except jwt.InvalidTokenError:
        raise _unauthorized("Token inválido.")


async def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[dict[str, Any]]:
    """Dependência FastAPI que exige `Authorization: Bearer <token>` válido.

    Com AUTH_ENABLED=False retorna None sem validar nada (modo de contingência).
    """
    if not is_auth_enabled():
        return None
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise _unauthorized("Cabeçalho Authorization: Bearer <token> ausente ou malformado.")
    return decode_supabase_token(credentials.credentials)
