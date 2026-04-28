"""
Initial migration for apps.search.

Creates the ProductEmbedding sidecar. The embedding column adapts to the
runtime environment:

  * If ``pgvector`` is installed, a 512-dim ``vector`` column is created.
  * Otherwise, a JSONField fallback is created so signals/tasks keep working
    (cosine queries are unavailable in fallback mode).

To enable the pgvector path you must also run, once, in your Postgres DB:

    CREATE EXTENSION IF NOT EXISTS vector;
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


# Mirror apps.search.compat — kept inline so the migration is self-contained.
try:
    from pgvector.django import VectorField  # type: ignore
    _HAS_PGVECTOR = True
except Exception:  # noqa: BLE001
    _HAS_PGVECTOR = False
    VectorField = None  # type: ignore


def _embedding_field():
    if _HAS_PGVECTOR:
        return VectorField(dimensions=512, null=True, blank=True)
    return models.JSONField(null=True, blank=True)


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("products", "0002_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductEmbedding",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("image_embedding", _embedding_field()),
                (
                    "model_name",
                    models.CharField(
                        default="openai/clip-vit-base-patch32", max_length=128
                    ),
                ),
                ("image_hash", models.CharField(blank=True, default="", max_length=64)),
                ("last_indexed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "product",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="embedding",
                        to="products.product",
                    ),
                ),
            ],
            options={
                "verbose_name": "Product embedding",
                "verbose_name_plural": "Product embeddings",
                "db_table": "product_embeddings",
                "managed": True,
            },
        ),
        migrations.AddIndex(
            model_name="productembedding",
            index=models.Index(
                fields=["model_name"], name="prod_embed_model_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="productembedding",
            index=models.Index(
                fields=["last_indexed_at"], name="prod_embed_indexed_idx"
            ),
        ),
    ]
