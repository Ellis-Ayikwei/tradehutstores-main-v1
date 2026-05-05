"""
fx/views.py

GET /api/fx/rates/
  Returns live exchange rates relative to BASE_CURRENCY (GHS).
  Cached in Redis for 4 hours.
  Falls back to last DB snapshot → hardcoded approximates if everything is down.
  Clients receive a `stale: true` flag when rates are not fresh so they can
  show a subtle indicator in the UI.
"""

import logging
from django.core.cache import cache
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import requests

from .models import RateSnapshot

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
BASE_CURRENCY = getattr(settings, "BASE_CURRENCY", "GHS")
CACHE_TTL     = 60 * 60 * 4        # 4 hours
FALLBACK_TTL  = 60 * 60 * 24 * 7   # 7 days — last-resort cache

# Free, no API key required. Swap for Open Exchange Rates or fixer.io at scale.
FX_PROVIDER_URL = f"https://api.frankfurter.app/latest?from={BASE_CURRENCY}"

# Hardcoded last-resort rates (approximate, updated manually)
# These only show if Redis is cold AND the DB has no snapshot AND the provider is down
EMERGENCY_RATES: dict[str, float] = {
    "GHS": 1.0,
    "USD": 0.063,
    "EUR": 0.058,
    "GBP": 0.050,
    "NGN": 103.0,
    "KES": 8.5,
    "AUD": 0.097,
    "CAD": 0.086,
    "ZAR": 1.18,
}

CACHE_KEY          = f"fx:rates:{BASE_CURRENCY}"
CACHE_KEY_FALLBACK = f"fx:rates:{BASE_CURRENCY}:fallback"


def _build_payload(rates: dict, stale: bool = False) -> dict:
    return {"base": BASE_CURRENCY, "rates": rates, "stale": stale}


def _fetch_from_provider() -> dict | None:
    """
    Calls the external FX provider.
    Returns a rates dict on success, None on any failure.
    """
    try:
        resp = requests.get(FX_PROVIDER_URL, timeout=5)
        resp.raise_for_status()
        data  = resp.json()
        rates = {BASE_CURRENCY: 1.0, **data.get("rates", {})}
        return rates
    except Exception as exc:
        logger.warning("FX provider fetch failed: %s", exc)
        return None


def _persist_snapshot(rates: dict) -> None:
    """Save a fresh snapshot to the DB as the new current snapshot."""
    try:
        RateSnapshot.objects.create(
            base_currency=BASE_CURRENCY,
            rates=rates,
            is_current=True,
            provider="frankfurter",
        )
        # Keep only the last 30 snapshots to avoid unbounded growth
        old_ids = (
            RateSnapshot.objects
            .order_by("-fetched_at")
            .values_list("id", flat=True)[30:]
        )
        if old_ids:
            RateSnapshot.objects.filter(pk__in=list(old_ids)).delete()
    except Exception as exc:
        logger.error("Failed to persist rate snapshot: %s", exc)


@api_view(["GET"])
@permission_classes([AllowAny])
def fx_rates(request):
    """
    GET /api/fx/rates/

    Response:
      {
        "base":  "GHS",
        "rates": { "GHS": 1.0, "USD": 0.063, "EUR": 0.058, ... },
        "stale": false
      }

    `stale: true` means rates may be outdated — show a UI indicator.
    """

    # ── 1. Hot cache (Redis) ─────────────────────────────────────────────────
    cached = cache.get(CACHE_KEY)
    if cached:
        return Response(cached)

    # ── 2. Fetch from provider ───────────────────────────────────────────────
    fresh_rates = _fetch_from_provider()
    if fresh_rates:
        payload = _build_payload(fresh_rates, stale=False)
        cache.set(CACHE_KEY,          payload, CACHE_TTL)
        cache.set(CACHE_KEY_FALLBACK, payload, FALLBACK_TTL)
        _persist_snapshot(fresh_rates)
        return Response(payload)

    # ── 3. Warm fallback cache (Redis, potentially hours old) ────────────────
    fallback_cached = cache.get(CACHE_KEY_FALLBACK)
    if fallback_cached:
        logger.warning("FX provider unreachable — serving Redis fallback rates")
        return Response({**fallback_cached, "stale": True})

    # ── 4. DB snapshot (survives Redis restarts) ─────────────────────────────
    snapshot = RateSnapshot.objects.filter(is_current=True).first()
    if snapshot:
        logger.warning("FX provider unreachable — serving DB snapshot rates")
        payload = _build_payload(snapshot.rates, stale=True)
        # Repopulate Redis so next request is faster
        cache.set(CACHE_KEY_FALLBACK, payload, FALLBACK_TTL)
        return Response(payload)

    # ── 5. Emergency hardcoded rates ─────────────────────────────────────────
    logger.error("All FX sources failed — serving emergency hardcoded rates")
    return Response(_build_payload(EMERGENCY_RATES, stale=True))
