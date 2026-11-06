"""Error shape ``{"detail": "<message>", "code": "<snake_code>", ...extra}`` (plan 20 section 0).

``apps.core.errors`` does not exist yet, so the auctions app keeps a local copy with the
same signature. When BE-0 lands the core module, replace the body with a re-export.
"""

from rest_framework.exceptions import APIException

from .constants import IDEMPOTENCY_KEY_MAX


class ApiError(APIException):
    def __init__(self, status_code, code, detail=None, **extra):
        super().__init__(detail=detail or code.replace("_", " ").capitalize())
        self.status_code = status_code
        self.detail = {"detail": str(self.detail), "code": code, **extra}


def require_idempotency_key(request) -> str:
    key = (request.headers.get("Idempotency-Key") or "").strip()
    if not key:
        raise ApiError(400, "idempotency_key_required", "Idempotency-Key header is required.")
    if len(key) > IDEMPOTENCY_KEY_MAX:
        raise ApiError(400, "idempotency_key_invalid", "Idempotency-Key must be at most 64 characters.")
    return key
