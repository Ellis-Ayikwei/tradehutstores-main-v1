"""
products/management/commands/build_embeddings.py

Backfills CLIP image embeddings for all products that don't have one.
Run once after deploying the image_embedding field, then signals + Celery
handle new products automatically.

Usage:
    python manage.py build_embeddings
    python manage.py build_embeddings --overwrite       # re-embed everything
    python manage.py build_embeddings --batch-size 64   # tune for your RAM/GPU
    python manage.py build_embeddings --product-ids 1,2,3  # specific products
"""

import time
import requests
from io import BytesIO

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from PIL import Image


class Command(BaseCommand):
    help = "Generate CLIP image embeddings for products"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size", type=int, default=32,
            help="Number of products to process per batch (default: 32)",
        )
        parser.add_argument(
            "--overwrite", action="store_true",
            help="Re-embed products that already have an embedding",
        )
        parser.add_argument(
            "--product-ids", type=str, default=None,
            help="Comma-separated product IDs to embed (default: all)",
        )

    def handle(self, *args, **options):
        from products.models import Product
        from products.embedding import embed_image

        batch_size  = options["batch_size"]
        overwrite   = options["overwrite"]
        product_ids = options["product_ids"]

        # ── Build queryset ────────────────────────────────────────────────────
        qs = Product.objects.all()
        if product_ids:
            ids = [int(i.strip()) for i in product_ids.split(",")]
            qs  = qs.filter(pk__in=ids)
        if not overwrite:
            qs = qs.filter(image_embedding__isnull=True)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("No products to embed."))
            return

        self.stdout.write(f"Embedding {total} products (batch_size={batch_size})...")
        start   = time.time()
        updated = 0
        failed  = 0

        for batch_start in range(0, total, batch_size):
            batch     = list(qs[batch_start : batch_start + batch_size])
            to_update = []

            for product in batch:
                image_url = product.main_product_image or getattr(product, "image", None)
                if not image_url:
                    continue

                try:
                    # Fetch image
                    if str(image_url).startswith("http"):
                        resp = requests.get(image_url, timeout=15)
                        resp.raise_for_status()
                        img = Image.open(BytesIO(resp.content)).convert("RGB")
                    else:
                        path = settings.MEDIA_ROOT / str(image_url).lstrip("/")
                        img  = Image.open(path).convert("RGB")

                    product.image_embedding = embed_image(img)
                    to_update.append(product)

                except Exception as e:
                    failed += 1
                    self.stderr.write(f"  ✗ product {product.id}: {e}")

            if to_update:
                Product.objects.bulk_update(to_update, ["image_embedding"])
                updated += len(to_update)

            elapsed = time.time() - start
            rate    = updated / elapsed if elapsed > 0 else 0
            self.stdout.write(
                f"  {updated + batch_start}/{total}  "
                f"({rate:.1f} products/sec)  "
                f"failed={failed}"
            )

        elapsed = time.time() - start
        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. {updated} embedded, {failed} failed — {elapsed:.1f}s total."
            )
        )
        self.stdout.write(
            "\nNext step: create the pgvector index in Postgres:\n"
            "  CREATE INDEX product_embedding_idx\n"
            "    ON products_product\n"
            "    USING ivfflat (image_embedding vector_cosine_ops)\n"
            "    WITH (lists = 100);\n"
        )
