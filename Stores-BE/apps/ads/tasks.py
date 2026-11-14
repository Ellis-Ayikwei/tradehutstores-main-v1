import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(queue="default")
def abandon_stale_sponsored():
    """Beat, every 30 minutes: unpaid sponsored promotions older than 30 minutes become ``abandoned``.

    Idempotent; see ``sponsored_services.abandon_stale``."""
    from . import sponsored_services

    counts = sponsored_services.abandon_stale()
    if any(counts.values()):
        logger.info("abandon_stale_sponsored: %s", counts)
    return counts
