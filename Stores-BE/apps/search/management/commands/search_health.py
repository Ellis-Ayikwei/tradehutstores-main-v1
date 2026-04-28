"""
manage.py search_health

Print a one-page diagnostic of the search subsystem so an operator can tell
at a glance which features are wired up.

Usage:

    python manage.py search_health
"""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.products.models import Product

from apps.search.compat import HAS_CELERY, HAS_ELASTICSEARCH, HAS_PGVECTOR, has_clip
from apps.search.models import ProductEmbedding


class Command(BaseCommand):
    help = "Diagnose the search subsystem (libraries, settings, data)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Libraries"))
        self._row("django-elasticsearch-dsl", HAS_ELASTICSEARCH)
        self._row("pgvector", HAS_PGVECTOR)
        self._row("celery", HAS_CELERY)
        self._row("clip (torch + transformers)", has_clip())

        self.stdout.write(self.style.MIGRATE_HEADING("\nSettings"))
        self._kv("SEARCH_ENABLE_ES", getattr(settings, "SEARCH_ENABLE_ES", False))
        self._kv(
            "SEARCH_ENABLE_EMBEDDINGS",
            getattr(settings, "SEARCH_ENABLE_EMBEDDINGS", False),
        )
        self._kv(
            "SEARCH_ENABLE_SIGNALS",
            getattr(settings, "SEARCH_ENABLE_SIGNALS", False),
        )
        self._kv("ELASTICSEARCH_URL", getattr(settings, "ELASTICSEARCH_URL", "—"))
        self._kv("REDIS_URL", getattr(settings, "REDIS_URL", "—"))
        self._kv(
            "EMBEDDING_SERVICE_URL", getattr(settings, "EMBEDDING_SERVICE_URL", "—")
        )

        self.stdout.write(self.style.MIGRATE_HEADING("\nData"))
        products = Product.objects.count()
        embedded = ProductEmbedding.objects.exclude(
            image_embedding__isnull=True
        ).count()
        coverage = (embedded / products * 100) if products else 0.0
        self._kv("Total products", products)
        self._kv("With embeddings", embedded)
        self._kv("Coverage", f"{coverage:.1f}%")

    def _row(self, name: str, ok: bool) -> None:
        marker = self.style.SUCCESS("✓") if ok else self.style.ERROR("✗")
        self.stdout.write(f"  {marker}  {name}")

    def _kv(self, key: str, value) -> None:
        self.stdout.write(f"  {key:<30} {value}")
