"""
products/signals.py

Wires up two concerns:
  1. Elasticsearch sync  — keep the search index in sync with the DB
  2. Embedding generation — generate/refresh CLIP vectors when a product is saved

Both run asynchronously via Celery so product saves never block on
network I/O (ES write) or GPU inference (CLIP).

Register in your AppConfig:
    class ProductsConfig(AppConfig):
        def ready(self):
            import products.signals  # noqa
"""

import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver

from .models import Product

logger = logging.getLogger(__name__)


# ─── Elasticsearch sync ───────────────────────────────────────────────────────

@receiver(post_save, sender=Product)
def sync_product_to_es(sender, instance, created, **kwargs):
    """
    Index or update the product document in Elasticsearch.
    Runs in a Celery task to avoid blocking the save.
    """
    from .tasks import index_product_task
    index_product_task.delay(instance.pk)


@receiver(post_delete, sender=Product)
def remove_product_from_es(sender, instance, **kwargs):
    """Remove the product document from Elasticsearch when deleted."""
    from .tasks import deindex_product_task
    deindex_product_task.delay(instance.pk)


# ─── Embedding generation ─────────────────────────────────────────────────────

@receiver(pre_save, sender=Product)
def _capture_old_image(sender, instance, **kwargs):
    """
    Capture the previous image URL so we can detect changes in post_save.
    Stored as a transient attribute on the instance — not persisted.
    """
    if instance.pk:
        try:
            old = Product.objects.only("main_product_image", "image").get(pk=instance.pk)
            instance._old_image = old.main_product_image or old.image
        except Product.DoesNotExist:
            instance._old_image = None
    else:
        instance._old_image = None


@receiver(post_save, sender=Product)
def generate_embedding_on_save(sender, instance, created, **kwargs):
    """
    Trigger embedding generation when:
      - a new product is created, OR
      - the product image has changed
    """
    from .tasks import generate_product_embedding

    current_image = instance.main_product_image or instance.image
    if not current_image:
        return

    image_changed = created or (getattr(instance, "_old_image", None) != current_image)
    if image_changed:
        logger.debug("Queuing embedding for product %s", instance.pk)
        generate_product_embedding.delay(instance.pk)
