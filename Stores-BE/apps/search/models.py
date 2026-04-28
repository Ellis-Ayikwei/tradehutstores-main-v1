"""
apps.search.models

Search-specific persistence.

We deliberately avoid mutating ``apps.products.Product``. Instead the CLIP
image embedding lives on a sidecar ``ProductEmbedding`` row with a 1:1 link to
the product. This keeps the products app oblivious to search infrastructure
and lets the embedding column be created/dropped independently.

If pgvector is not installed, the embedding column degrades to a JSON-encoded
list — callers should check :data:`apps.search.compat.HAS_PGVECTOR` before
running cosine-distance queries.
"""

from django.db import models

from apps.products.models import Product
from apps.core.models import BaseModel

from .compat import HAS_PGVECTOR, VectorField


# Embedding dimension for CLIP ViT-B/32. Bump this if you swap models.
EMBEDDING_DIM = 512


def _embedding_field():
    """Return the appropriate column for the current install."""
    if HAS_PGVECTOR:
        return VectorField(dimensions=EMBEDDING_DIM, null=True, blank=True)
    # Graceful fallback: store the raw vector as JSON. ANN is unavailable
    # without pgvector, but signals/tasks still keep working.
    return models.JSONField(null=True, blank=True)


class ProductEmbedding(BaseModel):
    """
    Sidecar to ``products.Product`` holding the CLIP image embedding.

    Why a sidecar and not a column on Product?
      * Adding a vector column to a hot product table during a live deploy is
        risky; isolating it lets us roll search back without touching products.
      * Different operators may run different embedding models — keeping the
        record separate makes it easy to multi-version (just add a row).
    """

    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name="embedding",
    )

    image_embedding = _embedding_field()

    # Bookkeeping — used by build_embeddings to skip refresh-not-needed rows.
    model_name = models.CharField(max_length=128, default="openai/clip-vit-base-patch32")
    image_hash = models.CharField(max_length=64, blank=True, default="")
    last_indexed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = True
        db_table = "product_embeddings"
        verbose_name = "Product embedding"
        verbose_name_plural = "Product embeddings"
        indexes = [
            models.Index(fields=["model_name"]),
            models.Index(fields=["last_indexed_at"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Embedding for product#{self.product_id} ({self.model_name})"
