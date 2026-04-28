"""
manage.py build_embeddings

Backfill CLIP image embeddings for all products that don't have one yet.
Creates / updates rows in ``apps.search.ProductEmbedding``.

Usage:

    python manage.py build_embeddings
    python manage.py build_embeddings --overwrite
    python manage.py build_embeddings --batch-size 64
    python manage.py build_embeddings --product-ids "uuid1,uuid2"
    python manage.py build_embeddings --limit 100

Notes:
  * Requires SEARCH_ENABLE_EMBEDDINGS=true at runtime so settings load
    Pillow / torch / transformers without surprise.
  * The command does NOT use Celery; it generates embeddings inline so it
    works in environments without a broker.
"""

from __future__ import annotations

import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.products.models import Product

from apps.search.compat import HAS_PGVECTOR
from apps.search.embedding import embed_image_bytes, hash_image_bytes
from apps.search.models import ProductEmbedding
from apps.search.tasks import _fetch_image_bytes


class Command(BaseCommand):
    help = "Generate CLIP image embeddings for products."

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=32,
            help="Products processed before bulk_update (default: 32).",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Re-embed products that already have an embedding.",
        )
        parser.add_argument(
            "--product-ids",
            type=str,
            default=None,
            help="Comma-separated product UUIDs to embed (default: all).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of products to process (default: no limit).",
        )

    def handle(self, *args, **options):
        if not HAS_PGVECTOR:
            self.stdout.write(
                self.style.WARNING(
                    "pgvector is not installed — embeddings will be stored as JSON. "
                    "Cosine queries will not work until you install pgvector and the "
                    "Postgres extension."
                )
            )

        qs = Product.objects.exclude(main_product_image__exact="").exclude(
            main_product_image__isnull=True
        )

        if options["product_ids"]:
            ids = [pid.strip() for pid in options["product_ids"].split(",") if pid.strip()]
            qs = qs.filter(pk__in=ids)

        if not options["overwrite"]:
            already = ProductEmbedding.objects.exclude(
                image_embedding__isnull=True
            ).values_list("product_id", flat=True)
            qs = qs.exclude(pk__in=list(already))

        if options["limit"]:
            qs = qs[: options["limit"]]

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("No products to embed."))
            return

        batch_size = options["batch_size"]
        self.stdout.write(f"Embedding {total} products (batch_size={batch_size})...")

        start = time.time()
        updated = failed = 0

        for batch_start in range(0, total, batch_size):
            batch = list(qs[batch_start : batch_start + batch_size])
            for product in batch:
                if not product.main_product_image:
                    continue
                try:
                    image_bytes = _fetch_image_bytes(product.main_product_image)
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    self.stderr.write(f"  ✗ product {product.pk}: fetch failed ({exc})")
                    continue

                try:
                    digest = hash_image_bytes(image_bytes)
                    vec = embed_image_bytes(image_bytes)
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    self.stderr.write(f"  ✗ product {product.pk}: embed failed ({exc})")
                    continue

                emb, _ = ProductEmbedding.objects.get_or_create(product=product)
                try:
                    emb.image_embedding = vec.tolist()
                except AttributeError:
                    emb.image_embedding = list(vec)
                emb.image_hash = digest
                emb.last_indexed_at = timezone.now()
                emb.save(
                    update_fields=[
                        "image_embedding",
                        "image_hash",
                        "last_indexed_at",
                        "updated_at",
                    ]
                )
                updated += 1

            elapsed = time.time() - start
            rate = updated / elapsed if elapsed > 0 else 0
            self.stdout.write(
                f"  {min(batch_start + batch_size, total)}/{total}  "
                f"({rate:.1f} prod/s)  failed={failed}"
            )

        elapsed = time.time() - start
        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. {updated} embedded, {failed} failed — {elapsed:.1f}s total."
            )
        )

        if HAS_PGVECTOR:
            self.stdout.write(
                "\nNext step: ensure the pgvector index exists in Postgres:\n"
                "  CREATE INDEX IF NOT EXISTS product_embedding_idx\n"
                "    ON product_embeddings\n"
                "    USING ivfflat (image_embedding vector_cosine_ops)\n"
                "    WITH (lists = 100);\n"
            )
