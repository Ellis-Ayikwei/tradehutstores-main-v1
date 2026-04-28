"""
apps.search.apps

App config for the search subsystem.

The app deliberately does not crash when optional infrastructure
(Elasticsearch, Redis, Celery, pgvector, CLIP) is missing. It logs a warning
and registers nothing. This keeps the BE bootable in dev environments where
heavy services are not running.
"""

import logging

from django.apps import AppConfig
from django.conf import settings

logger = logging.getLogger(__name__)


class SearchConfig(AppConfig):
    name = "apps.search"
    label = "search"
    verbose_name = "Search (full-text + visual)"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        # Always import models so migrations can run.
        # Signals only register when explicitly enabled to avoid double-writes
        # during management commands or bulk imports.
        if getattr(settings, "SEARCH_ENABLE_SIGNALS", False):
            try:
                from . import signals  # noqa: F401

                logger.info("apps.search signals registered")
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("apps.search signals not loaded: %s", exc)
        else:
            logger.debug(
                "apps.search signals disabled (SEARCH_ENABLE_SIGNALS=False)"
            )
