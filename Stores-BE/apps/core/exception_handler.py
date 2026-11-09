"""DRF exception handler that also prints every API error to the server log.

Django's dev server only prints ``"POST /checkout/ HTTP/1.1" 422 109`` for a handled 4xx, so the reason
(``payment_method_unavailable``, ``out_of_stock``, a validation message...) never reached the terminal.
This keeps DRF's normal response untouched and adds one WARNING line per error response:

    API 422 POST /tradehut/api/v1/checkout/ code=payment_method_unavailable detail=Online payment ...

401s are skipped on purpose (the SPA refreshes its token constantly, which would drown the log).
Unhandled exceptions (500) return ``None`` here and are logged with a traceback by Django as before.
"""

import logging

from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("tradehut.api")

_MAX = 400


def _plain(value):
    """DRF wraps messages in ErrorDetail(string=..., code=...); print just the text."""
    if isinstance(value, dict):
        return {str(k): _plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_plain(v) for v in value]
    return str(value)


def _code_of(data):
    """The contract ``code`` key if present, else DRF's own code (``permission_denied``, ``not_found``...)."""
    if isinstance(data, dict):
        if isinstance(data.get("code"), str):
            return data["code"]
        return getattr(data.get("detail"), "code", None) or "-"
    return "-"


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None and response.status_code >= 400 and response.status_code != 401:
        request = context.get("request")
        data = response.data
        code = _code_of(data)
        if isinstance(data, dict):
            detail = _plain({k: v for k, v in data.items() if k != "code"})
            if set(detail) == {"detail"}:
                detail = detail["detail"]
        else:
            detail = _plain(data)
        logger.warning(
            "API %s %s %s code=%s detail=%s",
            response.status_code,
            getattr(request, "method", "?"),
            getattr(request, "path", "?"),
            code,
            str(detail)[:_MAX],
        )
    return response
