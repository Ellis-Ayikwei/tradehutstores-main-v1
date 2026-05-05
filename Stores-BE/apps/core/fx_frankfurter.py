"""
Live FX from Frankfurter (https://api.frankfurter.app) — same provider as tradehut_currency/fx.

Response shape: {"amount": 1.0, "base": "USD", "rates": {"EUR": 0.92, ...}}
Those rates are **units of quote currency per 1 unit of base**, matching apps.core.currency.convert_currency.
"""

from __future__ import annotations

import logging
from typing import Any

import requests

logger = logging.getLogger(__name__)

FRANKFURTER_LATEST = "https://api.frankfurter.app/latest"


def fetch_frankfurter_rates(base_currency: str) -> dict[str, float] | None:
    """
    Returns {BASE: 1.0, **uppercase ISO rates} or None on failure.
    """
    base = (base_currency or "USD").upper()
    try:
        resp = requests.get(
            FRANKFURTER_LATEST,
            params={"from": base},
            timeout=5,
        )
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()
        raw_rates = data.get("rates") or {}
        out: dict[str, float] = {base: 1.0}
        for code, val in raw_rates.items():
            try:
                out[str(code).upper()] = float(val)
            except (TypeError, ValueError):
                continue
        return out
    except Exception as exc:
        logger.warning("Frankfurter FX fetch failed: %s", exc)
        return None
