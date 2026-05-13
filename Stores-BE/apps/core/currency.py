"""
Store catalogue FX — mirror Stores-FE/lib/storeCurrency.ts (same DEFAULT_FX_RATES keys/values
and the same convert_currency formula).

`rates[code]` = units of `code` per **1 unit of** TRADEHUT_STORE_BASE_CURRENCY (default GHS).

Catalog `Decimal`/`float` prices should be interpreted in the store base unless a model exposes
a per-row currency field (pass that ISO code as `from_curr`).

If the base is not USD, replace default rates with a table expressed against your base, or
load from cache / external provider and merge before calling convert_currency.
"""

from __future__ import annotations

import math
from typing import Mapping

from django.conf import settings


def get_store_base_currency() -> str:
    return str(getattr(settings, "TRADEHUT_STORE_BASE_CURRENCY", "GHS")).upper()


# Keep formula + cross-rates aligned with Stores-FE/lib/storeCurrency.ts DEFAULT_FX_RATES.
# GHS-centered: units of quote per 1 GHS (legacy table was USD-centered; values = old_quote / 15.2).
_LEGACY_USD_PER_GHS = 15.2
DEFAULT_FX_RATES: dict[str, float] = {
    "GHS": 1.0,
    "USD": 1.0 / _LEGACY_USD_PER_GHS,
    "EUR": 0.85 / _LEGACY_USD_PER_GHS,
    "GBP": 0.73 / _LEGACY_USD_PER_GHS,
    "JPY": 110.14 / _LEGACY_USD_PER_GHS,
    "AUD": 1.35 / _LEGACY_USD_PER_GHS,
    "CAD": 1.25 / _LEGACY_USD_PER_GHS,
    "CHF": 0.91 / _LEGACY_USD_PER_GHS,
    "CNY": 6.45 / _LEGACY_USD_PER_GHS,
    "SEK": 8.51 / _LEGACY_USD_PER_GHS,
    "NZD": 1.42 / _LEGACY_USD_PER_GHS,
    "NGN": 1550 / _LEGACY_USD_PER_GHS,
    "KES": 130 / _LEGACY_USD_PER_GHS,
}


def get_default_fx_rates() -> dict[str, float]:
    """Mutable copy for callers that patch/merge server-side rates."""
    return dict(DEFAULT_FX_RATES)


def convert_currency(
    amount: float,
    from_curr: str,
    to_curr: str,
    rates: Mapping[str, float] | None = None,
) -> float:
    """
    Convert `amount` from `from_curr` to `to_curr` using the same formula as the frontend
    convertWithRates().
    """
    if not math.isfinite(amount):
        return amount
    fc = (from_curr or "").upper()
    tc = (to_curr or "").upper()
    if fc == tc:
        return amount
    table = dict(rates) if rates is not None else get_default_fx_rates()
    rate_from = table.get(fc)
    rate_to = table.get(tc)
    if rate_from is None or rate_to is None or rate_from == 0:
        return amount
    amount_in_base = amount / rate_from
    return amount_in_base * rate_to
