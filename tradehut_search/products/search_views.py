"""
products/search_views.py

All search-related API views:

  search()               — full-text product search with filters + facets
  autocomplete()         — dropdown: query suggestions + product hits
  image_search()         — upload an image → visually similar products
  text_to_image_search() — text description → visually similar products
  similar_products()     — PDP widget: products visually similar to a given product
"""

import hashlib
import logging
from io import BytesIO

import numpy as np
from django.conf import settings
from django.core.cache import cache
from elasticsearch_dsl import Q
from pgvector.django import CosineDistance
from PIL import Image
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .documents import ProductDocument
from .models import Product
from .serializers import ProductSearchSerializer

logger = logging.getLogger(__name__)

PAGE_SIZE     = 24
MAX_AUTOCOMPLETE_SUGGESTIONS = 6
MAX_AUTOCOMPLETE_PRODUCTS    = 5
MAX_SIMILAR_PRODUCTS         = 8
SIMILARITY_THRESHOLD         = 0.5   # cosine distance — 0=identical, 2=opposite
MAX_IMAGE_SIZE_BYTES         = 5 * 1024 * 1024  # 5MB


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _serialize_hit(hit) -> dict:
    return {
        "id":    hit.id,
        "name":  hit.name,
        "price": getattr(hit, "final_price", None) or getattr(hit, "price", None),
        "image": getattr(hit, "main_product_image", None),
        "score": round(hit.meta.score or 0, 4),
    }


def _get_query_embedding(image_bytes: bytes) -> np.ndarray:
    """
    Embed image bytes to a CLIP vector.
    Tries the dedicated embedding service first (production split),
    falls back to local inference (development).
    Caches by image hash so identical uploads skip inference.
    """
    cache_key = f"clip_embed:{hashlib.sha256(image_bytes).hexdigest()}"
    cached    = cache.get(cache_key)
    if cached is not None:
        return np.frombuffer(cached, dtype=np.float32)

    embedding_service_url = getattr(settings, "EMBEDDING_SERVICE_URL", None)

    if embedding_service_url:
        # Production: call dedicated FastAPI service
        import httpx
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                f"{embedding_service_url}/embed/image",
                files={"file": ("image.jpg", image_bytes, "image/jpeg")},
            )
        resp.raise_for_status()
        vec = np.array(resp.json()["embedding"], dtype=np.float32)
    else:
        # Development: run locally
        from .embedding import embed_image_bytes
        vec = embed_image_bytes(image_bytes)

    cache.set(cache_key, vec.tobytes(), timeout=3_600)
    return vec


def _get_text_embedding(text: str) -> np.ndarray:
    cache_key = f"clip_text_embed:{hashlib.sha256(text.encode()).hexdigest()}"
    cached    = cache.get(cache_key)
    if cached is not None:
        return np.frombuffer(cached, dtype=np.float32)

    embedding_service_url = getattr(settings, "EMBEDDING_SERVICE_URL", None)
    if embedding_service_url:
        import httpx
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                f"{embedding_service_url}/embed/text",
                params={"q": text},
            )
        resp.raise_for_status()
        vec = np.array(resp.json()["embedding"], dtype=np.float32)
    else:
        from .embedding import embed_text
        vec = embed_text(text)

    cache.set(cache_key, vec.tobytes(), timeout=3_600)
    return vec


# ─── Text search ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def search(request):
    """
    Full-text product search with filtering and facet aggregations.

    GET /api/search/?q=wireless+headphones
                    &category=Electronics
                    &brand=Sony
                    &min_price=100
                    &max_price=500
                    &in_stock=true
                    &page=1
    """
    q         = request.GET.get("q", "").strip()
    category  = request.GET.get("category")
    brand     = request.GET.get("brand")
    min_price = request.GET.get("min_price")
    max_price = request.GET.get("max_price")
    in_stock  = request.GET.get("in_stock")
    page      = max(1, int(request.GET.get("page", 1)))
    offset    = (page - 1) * PAGE_SIZE

    # ── Build query ───────────────────────────────────────────────────────────
    if q:
        query = Q(
            "multi_match",
            query=q,
            fields=["name^4", "name_suggest^3", "brand^2", "tags^2", "description"],
            fuzziness="AUTO",
            type="best_fields",
        )
    else:
        query = Q("match_all")

    s = ProductDocument.search().query(query)

    # ── Filters ───────────────────────────────────────────────────────────────
    if category:
        s = s.filter("term", category=category)
    if brand:
        s = s.filter("term", brand=brand)
    if in_stock == "true":
        s = s.filter("term", in_stock=True)
    if min_price or max_price:
        price_range = {}
        if min_price: price_range["gte"] = float(min_price)
        if max_price: price_range["lte"] = float(max_price)
        s = s.filter("range", final_price=price_range)

    # ── Aggregations (facets for the filter sidebar) ──────────────────────────
    s.aggs.bucket("categories",  "terms", field="category",    size=30)
    s.aggs.bucket("brands",      "terms", field="brand",       size=30)
    s.aggs.bucket("price_stats", "stats", field="final_price")

    # ── Paginate ──────────────────────────────────────────────────────────────
    s = s.sort("_score")[offset : offset + PAGE_SIZE]

    response = s.execute()
    aggs     = response.aggregations

    return Response({
        "total":   response.hits.total.value,
        "page":    page,
        "results": [_serialize_hit(hit) for hit in response],
        "facets": {
            "categories": [
                {"label": b.key, "count": b.doc_count}
                for b in aggs.categories.buckets
            ],
            "brands": [
                {"label": b.key, "count": b.doc_count}
                for b in aggs.brands.buckets
            ],
            "price_stats": {
                "min": aggs.price_stats.min,
                "max": aggs.price_stats.max,
                "avg": round(aggs.price_stats.avg or 0, 2),
            },
        },
    })


@api_view(["GET"])
def autocomplete(request):
    """
    Fast dropdown autocomplete — fires on every keystroke (debounce on frontend).

    Returns two layers:
      suggestions — query strings (completion suggester, sub-10ms)
      products    — up to 5 actual product hits with images

    GET /api/search/autocomplete/?q=wire
    """
    q = request.GET.get("q", "").strip()
    if len(q) < 2:
        return Response({"suggestions": [], "products": []})

    # ── 1. Query suggestions ─────────────────────────────────────────────────
    s = ProductDocument.search()
    s = s.suggest(
        "name_suggestions",
        q,
        completion={
            "field": "suggest",
            "size":  MAX_AUTOCOMPLETE_SUGGESTIONS,
            "skip_duplicates": True,
            "fuzzy": {"fuzziness": 1},
        },
    )
    suggest_response = s.execute()
    suggestions = [
        opt.text
        for opt in suggest_response.suggest.name_suggestions[0].options
    ]

    # ── 2. Product hits ──────────────────────────────────────────────────────
    product_s = (
        ProductDocument.search()
        .query(
            "multi_match",
            query=q,
            fields=["name_suggest^3", "name^2", "brand"],
            type="best_fields",
        )
        .filter("term", in_stock=True)
        .extra(size=MAX_AUTOCOMPLETE_PRODUCTS)
    )
    product_response = product_s.execute()

    return Response({
        "suggestions": suggestions,
        "products":    [_serialize_hit(hit) for hit in product_response],
    })


# ─── Image / visual search ────────────────────────────────────────────────────

@api_view(["POST"])
@parser_classes([MultiPartParser])
def image_search(request):
    """
    Upload an image → find visually similar products via CLIP + pgvector.

    POST /api/search/image/
    Body: multipart/form-data { image: <file> }
    """
    if "image" not in request.FILES:
        return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

    uploaded = request.FILES["image"]

    if uploaded.size > MAX_IMAGE_SIZE_BYTES:
        return Response({"error": "Image too large. Max 5MB."}, status=status.HTTP_400_BAD_REQUEST)
    if not uploaded.content_type.startswith("image/"):
        return Response({"error": "File must be an image."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        image_bytes  = uploaded.read()
        query_vector = _get_query_embedding(image_bytes)
    except Exception as exc:
        logger.exception("Embedding failed during image search")
        return Response({"error": "Could not process image."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    results = _vector_search(query_vector, exclude_id=None)
    return Response({"total": len(results), "results": results})


@api_view(["GET"])
def text_to_image_search(request):
    """
    Find products visually matching a text description.
    Works because CLIP maps text + images into the same vector space.

    GET /api/search/visual/?q=red+leather+sofa
    """
    q = request.GET.get("q", "").strip()
    if not q:
        return Response({"error": "Query required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        query_vector = _get_text_embedding(q)
    except Exception:
        logger.exception("Text embedding failed")
        return Response({"error": "Could not process query."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    results = _vector_search(query_vector, exclude_id=None)
    return Response({"total": len(results), "results": results})


@api_view(["GET"])
def similar_products(request, product_id: int):
    """
    'Customers also viewed' / visually similar products for the PDP widget.
    GET /api/products/<id>/similar/
    """
    try:
        product = Product.objects.only("image_embedding").get(pk=product_id)
    except Product.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if product.image_embedding is None:
        return Response({"results": []})

    results = _vector_search(
        product.image_embedding,
        exclude_id=product_id,
        limit=MAX_SIMILAR_PRODUCTS,
        threshold=0.6,   # slightly looser for the "similar" widget
    )
    return Response({"results": results})


def _vector_search(
    query_vector: np.ndarray,
    exclude_id: int | None = None,
    limit: int = PAGE_SIZE,
    threshold: float = SIMILARITY_THRESHOLD,
) -> list[dict]:
    """
    Shared pgvector cosine similarity search.
    Returns serialised products with a `similarity` score (0–1, higher = more similar).
    """
    qs = (
        Product.objects
        .exclude(image_embedding__isnull=True)
        .filter(in_stock=True)
        .annotate(distance=CosineDistance("image_embedding", query_vector))
        .order_by("distance")
        .select_related("category", "brand")
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)

    qs = qs[:limit * 2]   # over-fetch then threshold-filter

    results = []
    for p in qs:
        if p.distance > threshold:
            break
        results.append({
            **ProductSearchSerializer(p).data,
            "similarity": round(1 - float(p.distance), 3),
        })
        if len(results) >= limit:
            break

    return results
