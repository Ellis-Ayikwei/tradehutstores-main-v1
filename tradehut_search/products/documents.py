"""
products/documents.py

Elasticsearch document for Product.
Defines the index mapping, custom analysers (autocomplete, synonyms),
and the completion suggester field.

Sync strategy:
  - Individual saves/deletes → Django signals (automatic)
  - Bulk imports → call registry.update(queryset) manually
  - Full rebuild → python manage.py search_index --rebuild
"""

from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry
from elasticsearch_dsl import analyzer, token_filter

from .models import Product


# ─── Custom analysers ─────────────────────────────────────────────────────────

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

# Applied at index time — enables partial matching ("wire" → "wireless")
autocomplete_analyzer = analyzer(
    "autocomplete_analyzer",
    tokenizer="standard",
    filter=["lowercase", edge_ngram_filter, synonym_filter],
)

# Applied at search time — don't n-gram the user's query, just lowercase + synonyms
search_analyzer = analyzer(
    "search_analyzer",
    tokenizer="standard",
    filter=["lowercase", synonym_filter],
)


# ─── Document ─────────────────────────────────────────────────────────────────

@registry.register_document
class ProductDocument(Document):
    # Keyword fields — exact match, used in filters and aggregations (facet sidebar)
    category = fields.KeywordField(attr="category.name")
    brand    = fields.KeywordField(attr="brand.name")   # adjust attr to your FK path
    tags     = fields.KeywordField(multi=True)

    # Autocomplete-analysed name — powers partial matching in full search
    name_suggest = fields.TextField(
        attr="name",
        analyzer=autocomplete_analyzer,
        search_analyzer=search_analyzer,
    )

    # Completion field — powers the fast query suggestions in the dropdown
    # Separate from full-text search; uses a dedicated in-memory FST structure
    suggest = fields.CompletionField()

    class Index:
        name     = "products"
        settings = {
            "number_of_shards":   1,
            "number_of_replicas": 1,
            "dynamic": "strict",           # never auto-map unknown fields
            "max_result_window": 50_000,
        }

    class Django:
        model  = Product
        fields = [
            "id",
            "name",
            "description",
            "final_price",
            "price",
            "in_stock",
            "main_product_image",
        ]
        ignore_signals = False
        auto_refresh   = False   # don't force refresh after every write (use bulk)

    # ── prepare_ methods run before indexing ─────────────────────────────────

    def prepare_tags(self, instance):
        if hasattr(instance, "tags"):
            return list(instance.tags.values_list("name", flat=True))
        return []

    def prepare_suggest(self, instance):
        """
        Feed the completion suggester with multiple input variants.
        'sony' → suggests 'Sony WH-1000XM5', 'Sony Headphones' etc.
        """
        inputs = [instance.name]
        if hasattr(instance, "brand") and instance.brand:
            brand_name = getattr(instance.brand, "name", str(instance.brand))
            inputs.append(brand_name)
            inputs.append(f"{brand_name} {instance.name}")
        return {"input": inputs}
