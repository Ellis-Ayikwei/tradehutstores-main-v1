"""
Build and cache FX snapshots (Frankfurter + defaults). Same cache entry backs GET snapshot and POST quote.
Cache key version bump when payload shape changes.
"""

from __future__ import annotations

import hashlib
import json
import logging

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .currency import convert_currency, get_default_fx_rates, get_store_base_currency
from .fx_frankfurter import fetch_frankfurter_rates

logger = logging.getLogger(__name__)

# v2: includes snapshot_id + as_of (invalidate old cache entries)
FX_CACHE_KEY = "tradehut:fx:v2:{base}"


def _snapshot_id(base: str, rates: dict[str, float]) -> str:
    canonical = json.dumps(
        {
            "b": base,
            "r": {k: round(float(rates[k]), 6) for k in sorted(rates.keys())},
        },
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]


def _build_payload() -> dict:
    base = get_store_base_currency()
    ttl = int(getattr(settings, "TRADEHUT_FX_CACHE_SECONDS", 4 * 3600))
    use_live = getattr(settings, "TRADEHUT_FX_FETCH_FRANKFURTER", True)

    defaults = get_default_fx_rates()
    source = "fallback"
    stale = True
    rates: dict[str, float] = dict(defaults)

    if use_live:
        live = fetch_frankfurter_rates(base)
        if live:
            rates = {**defaults, **live}
            rates[base] = 1.0
            source = "frankfurter"
            stale = False
        else:
            logger.warning("FX snapshot using embedded defaults (Frankfurter unavailable)")

    as_of = timezone.now().isoformat()
    sid = _snapshot_id(base, rates)
    return {
        "base_currency": base,
        "rates": rates,
        "stale": stale,
        "source": source,
        "as_of": as_of,
        "snapshot_id": sid,
    }


def get_or_build_fx_snapshot() -> dict:
    """Return snapshot dict (from cache or freshly built)."""
    base = get_store_base_currency()
    key = FX_CACHE_KEY.format(base=base)
    hit = cache.get(key)
    if hit is not None:
        return hit

    payload = _build_payload()
    try:
        cache.set(key, payload, int(getattr(settings, "TRADEHUT_FX_CACHE_SECONDS", 4 * 3600)))
    except Exception as exc:
        logger.warning("FX cache set failed: %s", exc)
    return payload


def quote_checkout_amounts(
    *,
    snapshot: dict,
    target_currency: str,
    client_snapshot_id: str | None,
    subtotal_base: float,
    shipping_base: float,
    tax_base: float,
    line_items: list[dict] | None,
) -> dict:
    """
    Convert checkout components using the **same** rate table as `snapshot`.
    Optionally recompute subtotal from line_items and warn on mismatch.
    """
    base = snapshot["base_currency"]
    target = (target_currency or base).upper()
    rates: dict[str, float] = snapshot["rates"]
    sid_server = snapshot.get("snapshot_id") or ""
    mismatch = bool(client_snapshot_id) and client_snapshot_id != sid_server

    recomputed_sub = None
    if line_items:
        s = 0.0
        for li in line_items:
            try:
                u = float(li.get("unit_price", 0))
                q = float(li.get("quantity", 1))
                s += u * q
            except (TypeError, ValueError):
                continue
        recomputed_sub = round(s, 2)

    subtotal_base = float(subtotal_base)
    if recomputed_sub is not None and abs(recomputed_sub - subtotal_base) > 0.02:
        logger.warning(
            "FX quote subtotal mismatch: client=%s recomputed=%s",
            subtotal_base,
            recomputed_sub,
        )

    def c(amount: float) -> float:
        return round(convert_currency(float(amount), base, target, rates), 2)

    amounts = {
        "subtotal": c(subtotal_base),
        "shipping": c(shipping_base),
        "tax": c(tax_base),
    }
    amounts["total"] = round(
        amounts["subtotal"] + amounts["shipping"] + amounts["tax"],
        2,
    )

    line_totals: list[dict] = []
    if line_items:
        for li in line_items:
            try:
                u = float(li.get("unit_price", 0))
                q = float(li.get("quantity", 1))
                line_totals.append({"line_total": c(u * q)})
            except (TypeError, ValueError):
                line_totals.append({"line_total": 0.0})

    return {
        "base_currency": base,
        "target_currency": target,
        "snapshot_id": sid_server,
        "as_of": snapshot.get("as_of"),
        "stale": snapshot.get("stale", True),
        "source": snapshot.get("source", "fallback"),
        "snapshot_mismatch": mismatch,
        "amounts": amounts,
        "line_items": line_totals,
    }
