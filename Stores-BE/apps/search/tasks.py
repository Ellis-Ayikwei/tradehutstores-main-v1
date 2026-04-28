"""
apps.search.tasks

Celery tasks for asynchronous index sync + embedding generation.

Each task uses ``apps.search.compat.safe_shared_task`` so the import
gracefully degrades to a no-op when Celery isn't installed — calls to
``.delay(...)`` from signals therefore never crash the request.
"""

from __future__ import annotations

import logging
from io import BytesIO

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .compat import HAS_ELASTICSEARCH, safe_shared_task

logger = logging.getLogger(__name__)


# ─── Elasticsearch tasks ──────────────────────────────────────────────────────


@safe_shared_task(bind=True, max_retries=3, default_retry_delay=10)
def index_product_task(self, product_id):
    """Index/update a single product in Elasticsearch."""
    if not HAS_ELASTICSEARCH or not getattr(settings, "SEARCH_ENABLE_ES", False):
        return
    try:
        from apps.products.models import Product

        from .documents import ProductDocument

        if ProductDocument is None:
            return
        product = (
            Product.objects.select_related("category", "sub_category", "brand")
            .get(pk=product_id)
        )
        ProductDocument().update(product)
        logger.debug("ES indexed product %s", product_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ES index failed for product %s: %s", product_id, exc)
        try:
            raise self.retry(exc=exc)
        except Exception:  # pragma: no cover - in eager / no-celery mode
            pass


@safe_shared_task(bind=True, max_retries=3, default_retry_delay=10)
def deindex_product_task(self, product_id):
    """Remove a product document from Elasticsearch."""
    if not HAS_ELASTICSEARCH or not getattr(settings, "SEARCH_ENABLE_ES", False):
        return
    try:
        from .documents import ProductDocument

        if ProductDocument is None:
            return
        ProductDocument.get(id=product_id).delete()
    except Exception as exc:  # noqa: BLE001
        logger.debug("ES deindex skipped for %s: %s", product_id, exc)


# ─── Embedding tasks ──────────────────────────────────────────────────────────


@safe_shared_task(bind=True, max_retries=3, default_retry_delay=30, queue="embeddings")
def generate_product_embedding(self, product_id):
    """
    Fetch the product's main image and write its CLIP embedding to the
    ``ProductEmbedding`` sidecar.
    """
    if not getattr(settings, "SEARCH_ENABLE_EMBEDDINGS", False):
        return

    try:
        from apps.products.models import Product

        from .embedding import embed_image_bytes, hash_image_bytes
        from .models import ProductEmbedding

        product = Product.objects.only("id", "main_product_image").get(pk=product_id)
        image_field = product.main_product_image
        if not image_field:
            return

        # Fetch raw bytes — handles uploaded local files and remote URLs.
        try:
            image_bytes = _fetch_image_bytes(image_field)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not fetch image for product %s: %s", product_id, exc)
            return

        digest = hash_image_bytes(image_bytes)

        emb, _ = ProductEmbedding.objects.get_or_create(product=product)
        if emb.image_hash == digest and emb.image_embedding is not None:
            return  # nothing to do

        cache_key = f"clip_embed:{digest}"
        cached = cache.get(cache_key)
        if cached is not None:
            import numpy as np

            vec = np.frombuffer(cached, dtype=np.float32)
        else:
            vec = embed_image_bytes(image_bytes)
            try:
                cache.set(cache_key, vec.tobytes(), timeout=86_400)
            except Exception:  # noqa: BLE001 - cache backend optional
                pass

        # pgvector accepts iterables / lists / numpy arrays.
        try:
            emb.image_embedding = vec.tolist()
        except AttributeError:
            emb.image_embedding = list(vec)

        emb.image_hash = digest
        emb.last_indexed_at = timezone.now()
        emb.save(update_fields=["image_embedding", "image_hash", "last_indexed_at"])
        logger.info("Embedded product %s", product_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("Embedding failed for product %s: %s", product_id, exc)
        try:
            raise self.retry(exc=exc)
        except Exception:  # pragma: no cover
            pass


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _fetch_image_bytes(image_field) -> bytes:
    """Return raw bytes for a Django ``ImageFieldFile`` — local file or URL."""
    raw = getattr(image_field, "url", None) or str(image_field)

    if raw.startswith("http://") or raw.startswith("https://"):
        import requests

        resp = requests.get(raw, timeout=15)
        resp.raise_for_status()
        return resp.content

    # Use the file's storage backend so it works on S3 and local disk.
    file_obj = image_field.open("rb")
    try:
        return file_obj.read()
    finally:
        try:
            file_obj.close()
        except Exception:  # noqa: BLE001
            pass
