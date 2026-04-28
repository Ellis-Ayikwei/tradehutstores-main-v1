"""
products/tasks.py

Celery tasks for:
  1. Elasticsearch indexing / deindexing
  2. CLIP image embedding generation

Queue routing:
  - embeddings queue → worker with access to GPU / CLIP model
  - default queue    → any worker

In celery config (settings.py or celeryconfig.py):
    CELERY_TASK_ROUTES = {
        "products.tasks.generate_product_embedding": {"queue": "embeddings"},
        "products.tasks.index_product_task":         {"queue": "default"},
        "products.tasks.deindex_product_task":       {"queue": "default"},
    }
"""

import logging
import hashlib
import requests
from io import BytesIO

from celery import shared_task
from django.core.cache import cache
from PIL import Image

logger = logging.getLogger(__name__)


# ─── Elasticsearch tasks ──────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def index_product_task(self, product_id: int):
    """Index or update a single product document in Elasticsearch."""
    try:
        from .models import Product
        from .documents import ProductDocument

        product  = Product.objects.select_related("category", "brand").get(pk=product_id)
        doc      = ProductDocument()
        doc.update(product)
        logger.debug("ES indexed product %s", product_id)
    except Exception as exc:
        logger.warning("ES index failed for product %s: %s", product_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def deindex_product_task(self, product_id: int):
    """Remove a product document from Elasticsearch."""
    try:
        from .documents import ProductDocument
        ProductDocument.get(id=product_id).delete()
        logger.debug("ES deindexed product %s", product_id)
    except Exception as exc:
        # If it's already gone, that's fine
        logger.debug("ES deindex skipped for %s: %s", product_id, exc)


# ─── Embedding tasks ──────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="embeddings",
)
def generate_product_embedding(self, product_id: int):
    """
    Fetch the product's image, run CLIP, save the vector.

    Cache key: sha256(image_bytes) → avoids re-embedding duplicate images.
    Cache TTL: 24h (embeddings are deterministic, safe to cache long)
    """
    from .models import Product
    from .embedding import embed_image_bytes

    try:
        product   = Product.objects.only(
            "main_product_image", "image", "image_embedding"
        ).get(pk=product_id)

        image_url = product.main_product_image or product.image
        if not image_url:
            logger.debug("Product %s has no image, skipping embedding", product_id)
            return

        # Fetch image bytes
        if str(image_url).startswith("http"):
            resp = requests.get(image_url, timeout=15)
            resp.raise_for_status()
            image_bytes = resp.content
        else:
            from django.conf import settings
            path = settings.MEDIA_ROOT / str(image_url).lstrip("/")
            with open(path, "rb") as f:
                image_bytes = f.read()

        # Check cache — same image bytes always produce the same vector
        cache_key = f"clip_embed:{hashlib.sha256(image_bytes).hexdigest()}"
        cached    = cache.get(cache_key)

        if cached is not None:
            import numpy as np
            embedding = np.frombuffer(cached, dtype=np.float32)
        else:
            embedding = embed_image_bytes(image_bytes)
            cache.set(cache_key, embedding.tobytes(), timeout=86_400)  # 24h

        product.image_embedding = embedding
        product.save(update_fields=["image_embedding"])
        logger.info("Embedded product %s", product_id)

    except Product.DoesNotExist:
        logger.debug("Product %s no longer exists, skipping", product_id)
    except Exception as exc:
        logger.error("Embedding failed for product %s: %s", product_id, exc)
        raise self.retry(exc=exc)
