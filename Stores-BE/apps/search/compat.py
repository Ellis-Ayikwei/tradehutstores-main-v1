"""
apps.search.compat

Optional-dependency compatibility shims.

Search ships with several heavy dependencies (CLIP, Elasticsearch, pgvector,
Celery). We treat each one as optional so that:

  * The site keeps running if the operator has not installed everything yet.
  * Endpoints return a clean ``503`` instead of crashing with ``ImportError``.
  * Local development can rely on a subset (e.g. only Elasticsearch).

Use the boolean flags below in views and signals to gate behaviour.
"""

import logging

logger = logging.getLogger(__name__)

# ── pgvector ──────────────────────────────────────────────────────────────────
try:
    from pgvector.django import VectorField, CosineDistance  # noqa: F401

    HAS_PGVECTOR = True
except Exception:  # noqa: BLE001 - protect against ANY import-time error
    HAS_PGVECTOR = False
    VectorField = None  # type: ignore[assignment]
    CosineDistance = None  # type: ignore[assignment]
    logger.debug("pgvector not available — visual search disabled")


# ── Elasticsearch ─────────────────────────────────────────────────────────────
try:
    from django_elasticsearch_dsl import Document, fields  # noqa: F401
    from django_elasticsearch_dsl.registries import registry  # noqa: F401
    from elasticsearch_dsl import Q, analyzer, token_filter  # noqa: F401

    HAS_ELASTICSEARCH = True
except Exception:  # noqa: BLE001
    HAS_ELASTICSEARCH = False
    logger.debug("django-elasticsearch-dsl not available — text search disabled")


# ── Celery ────────────────────────────────────────────────────────────────────
try:
    from celery import shared_task  # noqa: F401

    HAS_CELERY = True
except Exception:  # noqa: BLE001
    HAS_CELERY = False
    logger.debug("celery not available — async embedding disabled")


# ── CLIP / transformers ───────────────────────────────────────────────────────
def has_clip() -> bool:
    """Lazy probe — torch + transformers are huge, only import on demand."""
    try:
        import torch  # noqa: F401
        from transformers import CLIPModel, CLIPProcessor  # noqa: F401
    except Exception:  # noqa: BLE001
        return False
    return True


def safe_shared_task(*args, **kwargs):
    """
    Decorator wrapper:
      * If Celery is installed, behaves exactly like ``@shared_task(...)``.
      * If Celery is NOT installed, returns a no-op shim with the same surface
        area (``.delay(...)`` exists but does nothing). This means signal
        handlers can call ``mytask.delay(pk)`` unconditionally.
    """
    if HAS_CELERY:
        return shared_task(*args, **kwargs)

    def decorator(fn):
        class _NoopTask:
            __name__ = fn.__name__

            def __call__(self, *a, **kw):
                return fn(*a, **kw)

            def delay(self, *_a, **_kw):  # noqa: D401
                logger.debug(
                    "Celery missing — skipping async task %s", fn.__name__
                )
                return None

            def apply_async(self, *_a, **_kw):  # noqa: D401
                return None

        return _NoopTask()

    return decorator
