"""
apps.search.signals

When ``SEARCH_ENABLE_SIGNALS`` is true (see ``apps.search.apps``), product
saves/deletes trigger:

  1. ES re-index (if SEARCH_ENABLE_ES)
  2. Embedding regeneration (if SEARCH_ENABLE_EMBEDDINGS) when the image has
     changed.

Both effects are dispatched via Celery tasks that no-op when Celery isn't
installed — see ``apps.search.compat``.
"""

import logging

from django.conf import settings
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from apps.products.models import Product, ProductImage

from .tasks import (
    deindex_product_task,
    generate_product_embedding,
    index_product_task,
)

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Product)
def _on_product_saved(sender, instance, created, **_kwargs):
    if getattr(settings, "SEARCH_ENABLE_ES", False):
        index_product_task.delay(instance.pk)

    if getattr(settings, "SEARCH_ENABLE_EMBEDDINGS", False):
        current = getattr(instance, "display_main_image", None)
        old = getattr(instance, "_search_old_image", None)
        if created or (str(current) != str(old)):
            generate_product_embedding.delay(instance.pk)


@receiver(pre_save, sender=Product)
def _capture_old_image(sender, instance, **_kwargs):
    if instance.pk:
        try:
            previous = Product.objects.prefetch_related("product_images").get(
                pk=instance.pk
            )
            instance._search_old_image = previous.display_main_image
        except Product.DoesNotExist:
            instance._search_old_image = None
    else:
        instance._search_old_image = None


@receiver(post_save, sender=ProductImage)
@receiver(post_delete, sender=ProductImage)
def _on_product_image_changed(sender, instance, **_kwargs):
    """Gallery rows affect ``display_main_image``; refresh search index / embeddings."""
    pid = getattr(instance, "product_id", None)
    if not pid:
        return
    if getattr(settings, "SEARCH_ENABLE_ES", False):
        index_product_task.delay(pid)
    if getattr(settings, "SEARCH_ENABLE_EMBEDDINGS", False):
        generate_product_embedding.delay(pid)


@receiver(post_delete, sender=Product)
def _on_product_deleted(sender, instance, **_kwargs):
    if getattr(settings, "SEARCH_ENABLE_ES", False):
        deindex_product_task.delay(instance.pk)
