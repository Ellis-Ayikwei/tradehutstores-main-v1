"""
Store catalogue FX — mirror Stores-FE/lib/storeCurrency.ts (same DEFAULT_FX_RATES keys/values
and the same convert_currency formula).

`rates[code]` = units of `code` per **1 unit of** TRADEHUT_STORE_BASE_CURRENCY (default USD).

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
    return str(getattr(settings, "TRADEHUT_STORE_BASE_CURRENCY", "USD")).upper()


# Keep numeric values aligned with Stores-FE/lib/storeCurrency.ts DEFAULT_FX_RATES.
DEFAULT_FX_RATES: dict[str, float] = {
    "USD": 1,
    "EUR": 0.85,
    "GBP": 0.73,
    "JPY": 110.14,
    "AUD": 1.35,
    "CAD": 1.25,
    "CHF": 0.91,
    "CNY": 6.45,
    "SEK": 8.51,
    "NZD": 1.42,
    "GHS": 15.2,
    "NGN": 1550,
    "KES": 130,
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
