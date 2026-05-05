"""
apps.search.documents

Elasticsearch document for ``apps.products.Product``.

Loaded only when ``django-elasticsearch-dsl`` is installed AND
``SEARCH_ENABLE_ES`` is truthy in settings. Otherwise this module exposes a
``ProductDocument = None`` placeholder so callers can probe with a simple
truthiness check.
"""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings

from .compat import HAS_ELASTICSEARCH

logger = logging.getLogger(__name__)


ProductDocument: Any = None


if HAS_ELASTICSEARCH and getattr(settings, "SEARCH_ENABLE_ES", False):
    from django_elasticsearch_dsl import Document, fields
    from django_elasticsearch_dsl.registries import registry
    from elasticsearch_dsl import analyzer, token_filter

    from apps.products.models import Product

    synonym_filter = token_filter(
        "synonym_filter",
        type="synonym",
        synonyms=[
            "fridge, refrigerator, cooler",
            "tv, television, screen, monitor",
            "phone, mobile, smartphone, handset",
            "laptop, notebook, computer",
            "blender, mixer, juicer",
            "sofa, couch, settee",
            "sneakers, trainers, kicks",
        ],
    )

    edge_ngram_filter = token_filter(
        "edge_ngram_filter",
        type="edge_ngram",
        min_gram=2,
        max_gram=20,
    )

    # Index: edge_ngram only. Synonyms cannot share a chain with edge_ngram in ES 8
    # ("Token filter [edge_ngram_filter] cannot be used to parse synonyms").
    autocomplete_analyzer = analyzer(
        "autocomplete_analyzer",
        tokenizer="standard",
        filter=["lowercase", edge_ngram_filter],
    )

    # Query: lowercase + synonyms (matches expanded terms against ngram index).
    search_analyzer = analyzer(
        "search_analyzer",
        tokenizer="standard",
        filter=["lowercase", synonym_filter],
    )

    @registry.register_document
    class ProductDocument(Document):  # type: ignore[no-redef]
        category = fields.KeywordField(attr="category.name")
        sub_category = fields.KeywordField(attr="sub_category.sub_category_name")
        brand = fields.KeywordField(attr="brand.name")

        name_suggest = fields.TextField(
            attr="name",
            analyzer=autocomplete_analyzer,
            search_analyzer=search_analyzer,
        )

        suggest = fields.CompletionField()

        in_stock = fields.BooleanField(attr="available")
        final_price = fields.FloatField()
        main_product_image = fields.KeywordField()

        class Index:
            name = getattr(settings, "SEARCH_ES_INDEX", "tradehut_products")
            settings = {
                "number_of_shards": 1,
                "number_of_replicas": 1,
                "max_result_window": 50_000,
            }

        class Django:
            model = Product
            fields = [
                "id",
                "name",
                "description",
                "keywords",
                "average_rating",
                "total_reviews",
                "discount_percentage",
            ]
            ignore_signals = True   # we trigger via apps.search.signals
            auto_refresh = False

        def prepare_main_product_image(self, instance: Product) -> str:
            f = instance.display_main_image
            name = getattr(f, "name", None) if f else None
            return str(name) if name else ""

        def prepare_average_rating(self, instance: Product) -> float:
            v = instance.average_rating
            return float(v) if v is not None else 0.0

        def prepare_final_price(self, instance: Product) -> float | None:
            try:
                if instance.default_variant and instance.default_variant.price is not None:
                    price = float(instance.default_variant.price)
                else:
                    first = instance.variants.order_by("created_at").first()
                    price = float(first.price) if first and first.price is not None else None
            except Exception:  # noqa: BLE001
                price = None
            if price is None:
                return None
            discount = float(instance.discount_percentage or 0)
            return price - (price * discount / 100)

        def prepare_suggest(self, instance: Product) -> dict:
            inputs = [instance.name]
            if instance.brand:
                inputs.append(instance.brand.name)
                inputs.append(f"{instance.brand.name} {instance.name}")
            return {"input": [i for i in inputs if i]}
else:
    logger.debug(
        "ProductDocument disabled (HAS_ELASTICSEARCH=%s, SEARCH_ENABLE_ES=%s)",
        HAS_ELASTICSEARCH,
        getattr(settings, "SEARCH_ENABLE_ES", False),
    )
