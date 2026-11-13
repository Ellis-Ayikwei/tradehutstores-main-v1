"""Celery tasks. Correctness never depends on sweep timing: quote and award guards compare
``closes_at`` to the server clock, so a late sweep only delays the status flip and notifications."""

from celery import shared_task

from . import services


@shared_task(queue="default")
def sweep_rfqs():
    """Beat, every 300s: expire open / quoting RFQs past their windows and settle awarded ones."""
    return services.sweep()
