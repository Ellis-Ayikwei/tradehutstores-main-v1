"""
TradeHut backend package.

We try to import the Celery app eagerly so `@shared_task` registrations work
across the project, but we never let a missing celery dependency block
`manage.py runserver` — the import is wrapped to keep the dev experience
intact on hosts that don't need a worker.
"""

try:
    from .celery import app as celery_app  # noqa: F401
    __all__ = ("celery_app",)
except ImportError:
    # Celery not installed (e.g. minimal dev env). Silent — the search app
    # already degrades gracefully via apps/search/compat.py.
    pass
