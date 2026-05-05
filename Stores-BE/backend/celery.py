"""
backend.celery

Celery entrypoint for TradeHut workers.

Loaded explicitly from `manage.py` and `Procfile` so a fresh checkout that
doesn't have Celery installed (or doesn't want it) can still run `runserver`
without crashing — the import is gated by SEARCH_ENABLE_SIGNALS in settings.

Usage on Railway::

    celery -A backend worker -l INFO --concurrency=2
    celery -A backend beat -l INFO         # only if you wire periodic tasks

The autodiscover pulls `apps/*/tasks.py` automatically.
"""

from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

app = Celery("tradehut")

# All configuration with `CELERY_` prefix is read from Django settings.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Pick up tasks from any installed app that exposes a `tasks` module.
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self) -> None:
    print(f"Request: {self.request!r}")
