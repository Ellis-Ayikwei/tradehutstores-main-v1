"""
fx/tasks.py

Celery beat task — refreshes FX rates every 4 hours automatically.
No manual admin action needed in normal operation.

Add to your celery beat schedule in settings.py:

    from celery.schedules import crontab

    CELERY_BEAT_SCHEDULE = {
        ...
        "refresh-fx-rates": {
            "task":     "fx.tasks.refresh_fx_rates",
            "schedule": crontab(minute=0, hour="*/4"),  # every 4 hours
        },
    }
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="fx.tasks.refresh_fx_rates", bind=True, max_retries=3, default_retry_delay=300)
def refresh_fx_rates(self):
    """
    Fetch fresh rates from the FX provider and update Redis + DB.
    Runs every 4 hours via Celery Beat.
    """
    from django.core.cache import cache
    from .views import (
        _fetch_from_provider, _persist_snapshot, _build_payload,
        CACHE_KEY, CACHE_KEY_FALLBACK, CACHE_TTL, FALLBACK_TTL,
    )

    try:
        rates = _fetch_from_provider()
        if not rates:
            raise ValueError("Provider returned no rates")

        payload = _build_payload(rates, stale=False)
        cache.set(CACHE_KEY,          payload, CACHE_TTL)
        cache.set(CACHE_KEY_FALLBACK, payload, FALLBACK_TTL)
        _persist_snapshot(rates)
        logger.info("FX rates refreshed. %d currencies.", len(rates))
        return {"currencies": len(rates)}

    except Exception as exc:
        logger.error("FX rate refresh failed: %s", exc)
        raise self.retry(exc=exc)
