"""
fx/views.py

Single endpoint: GET /api/fx/rates/
Returns exchange rates relative to BASE_CURRENCY (GHS).

Caching strategy:
  - Primary:  Redis cache, 4-hour TTL
  - Fallback: 7-day stale cache when FX provider is unreachable
  - Last resort: hardcoded approximates (stale=True in response)

FX provider: Frankfurter (free, no API key)
Swap the URL in _fetch_from_provider() for Open Exchange Rates / fixer.io
if you need more currencies or higher reliability.
"""

import logging
import requests
from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response

logger = logging.getLogger(__name__)

BASE_CURRENCY  = 'GHS'
CACHE_TTL      = 60 * 60 * 4        # 4 hours
FALLBACK_TTL   = 60 * 60 * 24 * 7   # 7 days for stale fallback
CACHE_KEY      = f'fx_rates:{BASE_CURRENCY}'
FALLBACK_KEY   = f'fx_rates:{BASE_CURRENCY}:fallback'

# Last-resort hardcoded rates — only used if cache is also empty
HARDCODED_RATES = {
    'GHS': 1,     'USD': 0.063, 'EUR': 0.058,
    'GBP': 0.050, 'NGN': 103.0, 'KES': 8.5,
    'ZAR': 1.17,  'AUD': 0.097, 'CAD': 0.086,
}


def _fetch_from_provider() -> dict:
    """
    Fetch current rates from Frankfurter API.
    Returns a dict of rates with BASE_CURRENCY = 1.
    Raises on network / HTTP errors.
    """
    url  = f'https://api.frankfurter.app/latest?from={BASE_CURRENCY}'
    resp = requests.get(url, timeout=5)
    resp.raise_for_status()
    data = resp.json()
    return {BASE_CURRENCY: 1.0, **data['rates']}


@api_view(['GET'])
def fx_rates(request):
    """
    GET /api/fx/rates/

    Response shape:
    {
        "base": "GHS",
        "rates": { "GHS": 1, "USD": 0.063, "EUR": 0.058, ... },
        "stale": false   // true when serving cached/fallback rates
    }
    """
    # 1. Serve from cache if available (hot path)
    cached = cache.get(CACHE_KEY)
    if cached:
        return Response(cached)

    # 2. Fetch fresh rates from provider
    try:
        rates   = _fetch_from_provider()
        payload = {'base': BASE_CURRENCY, 'rates': rates, 'stale': False}

        cache.set(CACHE_KEY,    payload, CACHE_TTL)
        cache.set(FALLBACK_KEY, payload, FALLBACK_TTL)  # persist as fallback

        logger.info('FX rates refreshed from provider')
        return Response(payload)

    except Exception as e:
        logger.warning('FX provider unreachable: %s', e)

    # 3. Serve stale fallback if provider is down
    fallback = cache.get(FALLBACK_KEY)
    if fallback:
        return Response({**fallback, 'stale': True})

    # 4. Absolute last resort — hardcoded approximates
    logger.error('FX: no cache available, serving hardcoded fallback')
    return Response({
        'base':  BASE_CURRENCY,
        'rates': HARDCODED_RATES,
        'stale': True,
    })
