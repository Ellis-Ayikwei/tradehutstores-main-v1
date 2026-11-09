import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(queue="default")
def expire_checkout_sessions():
    """Beat, every 2 minutes: unpaid Paystack checkouts past their window.

    Asks Paystack first (a missed webhook is settled as paid), then cancels the orders and returns the reserved
    stock. A checkout whose mobile-money approval is still in flight is left alone. See
    ``payment_flow.reconcile_or_expire``. The same logic is available as ``manage.py expire_checkout_sessions``.
    """
    from .payment_flow import expire_stale_sessions

    counts = expire_stale_sessions()
    if any(counts.values()):
        logger.info("expire_checkout_sessions: %s", counts)
    return counts
