"""
Initial migration for apps.search.

Embeddings are stored as JSON (list of floats). This avoids requiring the
PostgreSQL ``vector`` type / ``pgvector`` extension at migrate time; ANN
queries use application-side cosine similarity (see ``apps.search.views``).
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


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
                ("image_embedding", models.JSONField(blank=True, null=True)),
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
