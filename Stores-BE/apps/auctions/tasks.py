"""Celery tasks. Correctness never depends on close timing (plan 10 section 6):
``place_bid`` rejects at ``now >= ends_at`` and ``display_status`` shows ``ended``."""

import logging

from celery import shared_task

from . import closing

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5, default_retry_delay=10, acks_late=True, queue="default")
def close_auction(self, auction_id):
    try:
        return closing.close_auction_now(auction_id)
    except Exception as exc:
        logger.exception("close_auction failed for %s", auction_id)
        raise self.retry(exc=exc)


@shared_task(queue="default")
def sweep_auctions():
    """Beat, every 30s: activate due scheduled auctions, close overdue ones, arm near-ending ones."""
    return closing.sweep()


@shared_task(queue="default")
def settle_pending_orders():
    """Beat, every 60s: retry winner orders that could not be created at close time."""
    return closing.settle_pending_orders()
