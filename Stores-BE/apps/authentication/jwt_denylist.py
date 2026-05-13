"""
Redis-backed JWT denial list (JTIs invalidated on logout).

Enable with::

    AUTH_TOKEN_DENYLIST_BACKEND=redis

Optional ``REDIS_DENYLIST_URL`` defaults to ``REDIS_URL``.
"""

from __future__ import annotations

import logging
import time

from django.conf import settings
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

logger = logging.getLogger(__name__)

KEY_PREFIX = "tradehut:jwt:deny:jti"


def backend_enabled() -> bool:
    return getattr(settings, "AUTH_TOKEN_DENYLIST_BACKEND", "off").strip().lower() == "redis"


def _redis_url() -> str:
    u = getattr(settings, "REDIS_DENYLIST_URL", "") or getattr(settings, "REDIS_URL", "") or ""
    return str(u).strip()


def _ttl_from_exp(exp: int | None, *, max_cap_seconds: int) -> int:
    if not exp:
        return max(1, min(max_cap_seconds, 3600))
    now = int(time.time())
    ttl = int(exp) - now
    return max(1, min(ttl, max_cap_seconds))


_redis_conn = None
_redis_url_missing_logged = False


def _redis_client():
    """Single lazily-created client."""
    global _redis_conn, _redis_url_missing_logged
    if _redis_conn is not None:
        return _redis_conn
    url = _redis_url()
    if not url:
        if not _redis_url_missing_logged:
            _redis_url_missing_logged = True
            logger.warning("AUTH_TOKEN_DENYLIST_BACKEND=redis but REDIS_URL / REDIS_DENYLIST_URL is empty")
        return None
    import redis

    _redis_conn = redis.from_url(
        url,
        decode_responses=True,
        socket_timeout=2.0,
        socket_connect_timeout=2.0,
    )
    return _redis_conn


def _client():
    if not backend_enabled():
        return None
    return _redis_client()


def block_jti(jti: str | None, *, exp: int | None, max_ttl_seconds: int) -> None:
    if not jti or not backend_enabled():
        return
    ttl = _ttl_from_exp(exp, max_cap_seconds=max_ttl_seconds)
    try:
        r = _client()
        if not r:
            return
        r.setex(f"{KEY_PREFIX}:{jti}", ttl, "1")
    except Exception:
        logger.warning("jwt_denylist: Redis SET failed (token not denied)", exc_info=True)


def is_jti_blocked(jti: str | None) -> bool:
    if not jti or not backend_enabled():
        return False
    try:
        r = _client()
        if not r:
            return False
        return bool(r.exists(f"{KEY_PREFIX}:{jti}"))
    except Exception:
        logger.warning("jwt_denylist: Redis EXISTS failed — allowing request", exc_info=True)
        return False


def block_access_token_str(raw: str | None) -> None:
    if not raw or not backend_enabled():
        return
    try:
        tok = AccessToken(str(raw).strip())
    except TokenError:
        return
    cap = int(getattr(settings, "ACCESS_TOKEN_LIFETIME_SECONDS", 1800))
    block_jti(tok.get("jti"), exp=tok.get("exp"), max_ttl_seconds=cap)


def block_refresh_token_str(raw: str | None) -> None:
    if not raw or not backend_enabled():
        return
    try:
        tok = RefreshToken(str(raw).strip())
    except TokenError:
        return
    cap = int(getattr(settings, "REFRESH_TOKEN_LIFETIME_SECONDS", 604800))
    block_jti(tok.get("jti"), exp=tok.get("exp"), max_ttl_seconds=cap)


def logout_block_tokens(request) -> None:
    """Best-effort: deny-list access Bearer + refresh from body/cookie."""
    if not backend_enabled():
        return
    auth = request.headers.get("Authorization") or ""
    if auth.startswith("Bearer "):
        block_access_token_str(auth.split(" ", 1)[1])

    rt = None
    data = request.data
    if isinstance(data, dict):
        rt = data.get("refresh") or data.get("refresh_token")
    rt = rt or request.COOKIES.get("_auth_refresh")
    if rt:
        block_refresh_token_str(str(rt))

