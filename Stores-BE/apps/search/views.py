"""
apps.search.views

Search API endpoints. Each endpoint has TWO codepaths:

  * The **fast path** — uses Elasticsearch / pgvector when enabled.
  * The **fallback path** — plain Django ORM ``icontains`` search. Slower,
    but means the FE keeps working in dev environments without ES/pgvector.

This is critical so existing frontends (which call ``/products/products/search/``
on the products app) and any new clients pointing at ``/search/`` both work
out of the box without an Elasticsearch cluster.
"""

from __future__ import annotations

import hashlib
import logging
from typing import List, Optional

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.decorators import (
    api_view,
    parser_classes,
    permission_classes,
)
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.products.models import Product

from .compat import HAS_ELASTICSEARCH, HAS_PGVECTOR
from .serializers import SearchProductSerializer

logger = logging.getLogger(__name__)

PAGE_SIZE = 24
MAX_AUTOCOMPLETE_SUGGESTIONS = 6
MAX_AUTOCOMPLETE_PRODUCTS = 5
MAX_SIMILAR_PRODUCTS = 8
SIMILARITY_THRESHOLD = 0.5
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _es_enabled() -> bool:
    return HAS_ELASTICSEARCH and getattr(settings, "SEARCH_ENABLE_ES", False)


def _vector_enabled() -> bool:
    return getattr(settings, "SEARCH_ENABLE_EMBEDDINGS", False)


def _base_queryset():
    return Product.objects.select_related(
        "category", "sub_category", "brand", "default_variant"
    ).prefetch_related("variants")


def _serialize(qs, request) -> List[dict]:
    return SearchProductSerializer(qs, many=True, context={"request": request}).data


def _paginate(qs, page: int) -> tuple[list, int]:
    total = qs.count()
    start = (max(1, page) - 1) * PAGE_SIZE
    return list(qs[start : start + PAGE_SIZE]), total


# ─── Text search ──────────────────────────────────────────────────────────────


@api_view(["GET"])
def search(request):
    """
    Full-text product search with filters and facets.

    Query params:
        q, category, sub_category, brand, condition,
        min_price, max_price, in_stock, page
    """
    q = (request.GET.get("q") or "").strip()
    page = max(1, int(request.GET.get("page") or 1))

    if _es_enabled():
        try:
            return _search_es(request, q, page)
        except Exception as exc:  # noqa: BLE001
            logger.warning("ES search failed, falling back to ORM: %s", exc)

    return _search_orm(request, q, page)


def _search_orm(request, q: str, page: int):
    qs = _base_queryset()

    if q:
        qs = qs.filter(
            Q(name__icontains=q)
            | Q(description__icontains=q)
            | Q(keywords__icontains=q)
            | Q(brand__name__icontains=q)
            | Q(category__name__icontains=q)
        )

    category = request.GET.get("category")
    sub_category = request.GET.get("sub_category")
    brand = request.GET.get("brand")
    condition = request.GET.get("condition")
    in_stock = request.GET.get("in_stock")
    min_price = request.GET.get("min_price")
    max_price = request.GET.get("max_price")

    if category:
        qs = qs.filter(category__name__iexact=category)
    if sub_category:
        qs = qs.filter(sub_category__sub_category_name__iexact=sub_category)
    if brand:
        qs = qs.filter(brand__name__iexact=brand)
    if condition:
        qs = qs.filter(condition__iexact=condition)
    if in_stock == "true":
        qs = qs.filter(available=True)
    if min_price:
        try:
            qs = qs.filter(variants__price__gte=float(min_price))
        except ValueError:
            pass
    if max_price:
        try:
            qs = qs.filter(variants__price__lte=float(max_price))
        except ValueError:
            pass

    qs = qs.distinct().order_by("-average_rating", "-total_reviews")

    items, total = _paginate(qs, page)
    return Response(
        {
            "total": total,
            "page": page,
            "page_size": PAGE_SIZE,
            "results": _serialize(items, request),
            "facets": _orm_facets(qs),
            "engine": "orm",
        }
    )


def _orm_facets(qs) -> dict:
    """Cheap facets sourced from the ORM result. Capped to keep payload small."""
    cats = (
        qs.values_list("category__name", flat=True)
        .distinct()
        .order_by("category__name")[:30]
    )
    brands = (
        qs.values_list("brand__name", flat=True)
        .distinct()
        .order_by("brand__name")[:30]
    )
    return {
        "categories": [{"label": c, "count": None} for c in cats if c],
        "brands": [{"label": b, "count": None} for b in brands if b],
    }


def _search_es(request, q: str, page: int):
    from elasticsearch_dsl import Q as ESQ

    from .documents import ProductDocument

    if ProductDocument is None:
        raise RuntimeError("ES disabled at runtime")

    offset = (page - 1) * PAGE_SIZE

    if q:
        query = ESQ(
            "multi_match",
            query=q,
            fields=["name^4", "name_suggest^3", "brand^2", "description"],
            fuzziness="AUTO",
            type="best_fields",
        )
    else:
        query = ESQ("match_all")

    s = ProductDocument.search().query(query)

    category = request.GET.get("category")
    brand = request.GET.get("brand")
    in_stock = request.GET.get("in_stock")
    min_price = request.GET.get("min_price")
    max_price = request.GET.get("max_price")

    if category:
        s = s.filter("term", category=category)
    if brand:
        s = s.filter("term", brand=brand)
    if in_stock == "true":
        s = s.filter("term", in_stock=True)
    if min_price or max_price:
        rng = {}
        if min_price:
            rng["gte"] = float(min_price)
        if max_price:
            rng["lte"] = float(max_price)
        s = s.filter("range", final_price=rng)

    s.aggs.bucket("categories", "terms", field="category", size=30)
    s.aggs.bucket("brands", "terms", field="brand", size=30)
    s.aggs.bucket("price_stats", "stats", field="final_price")

    s = s.sort("_score")[offset : offset + PAGE_SIZE]
    response = s.execute()
    aggs = response.aggregations

    return Response(
        {
            "total": response.hits.total.value,
            "page": page,
            "page_size": PAGE_SIZE,
            "results": [
                {
                    "id": str(hit.id),
                    "name": hit.name,
                    "price": getattr(hit, "final_price", None),
                    "image": getattr(hit, "main_product_image", None),
                    "category": getattr(hit, "category", None),
                    "brand": getattr(hit, "brand", None),
                    "score": round(hit.meta.score or 0, 4),
                }
                for hit in response
            ],
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
            "engine": "elasticsearch",
        }
    )


# ─── Autocomplete ─────────────────────────────────────────────────────────────


@api_view(["GET"])
def autocomplete(request):
    """
    Dropdown autocomplete. Always returns 200 with the schema:

        { suggestions: string[], products: SearchHit[] }

    Even if ES is unavailable the fallback ORM path returns useful data so the
    UI is never blank.
    """
    q = (request.GET.get("q") or "").strip()
    if len(q) < 2:
        return Response({"suggestions": [], "products": []})

    if _es_enabled():
        try:
            return _autocomplete_es(q)
        except Exception as exc:  # noqa: BLE001
            logger.warning("ES autocomplete failed, falling back: %s", exc)

    return _autocomplete_orm(request, q)


def _autocomplete_orm(request, q: str):
    qs = (
        _base_queryset()
        .filter(
            Q(name__icontains=q)
            | Q(brand__name__icontains=q)
            | Q(category__name__icontains=q)
        )
        .order_by("-average_rating", "-total_reviews")[:MAX_AUTOCOMPLETE_PRODUCTS]
    )

    products_payload = []
    suggestions: list[str] = []
    seen = set()
    for p in qs:
        suggestions.append(p.name)
        seen.add(p.name.lower())
        try:
            disp = p.display_main_image
            image = disp.url if disp else None
        except Exception:  # noqa: BLE001
            image = None
        products_payload.append(
            {
                "id": str(p.pk),
                "name": p.name,
                "price": float(p.default_variant.price) if p.default_variant_id and p.default_variant and p.default_variant.price is not None else None,
                "image": image,
                "category": p.category.name if p.category_id else None,
            }
        )

    # Top up the suggestion list with brand/category names — mimics ES completion.
    extra = (
        Product.objects.filter(name__icontains=q)
        .values_list("name", flat=True)
        .distinct()[: MAX_AUTOCOMPLETE_SUGGESTIONS - len(suggestions)]
    )
    for name in extra:
        if name and name.lower() not in seen:
            suggestions.append(name)
            seen.add(name.lower())

    return Response(
        {
            "suggestions": suggestions[:MAX_AUTOCOMPLETE_SUGGESTIONS],
            "products": products_payload,
            "engine": "orm",
        }
    )


def _autocomplete_es(q: str):
    from .documents import ProductDocument

    if ProductDocument is None:
        raise RuntimeError("ES disabled at runtime")

    s = ProductDocument.search().suggest(
        "name_suggestions",
        q,
        completion={
            "field": "suggest",
            "size": MAX_AUTOCOMPLETE_SUGGESTIONS,
            "skip_duplicates": True,
            "fuzzy": {"fuzziness": 1},
        },
    )
    suggest_response = s.execute()
    suggestions = [
        opt.text for opt in suggest_response.suggest.name_suggestions[0].options
    ]

    product_s = (
        ProductDocument.search()
        .query(
            "multi_match",
            query=q,
            fields=["name_suggest^3", "name^2", "brand"],
            type="best_fields",
        )
        .extra(size=MAX_AUTOCOMPLETE_PRODUCTS)
    )
    product_response = product_s.execute()

    return Response(
        {
            "suggestions": suggestions,
            "products": [
                {
                    "id": str(hit.id),
                    "name": hit.name,
                    "price": getattr(hit, "final_price", None),
                    "image": getattr(hit, "main_product_image", None),
                    "category": getattr(hit, "category", None),
                    "score": round(hit.meta.score or 0, 4),
                }
                for hit in product_response
            ],
            "engine": "elasticsearch",
        }
    )


# ─── Image / visual search ────────────────────────────────────────────────────


@api_view(["POST"])
@parser_classes([MultiPartParser])
def image_search(request):
    """Upload an image -> visually similar products via CLIP + pgvector."""
    if not _vector_enabled():
        return Response(
            {
                "error": "image_search_unavailable",
                "detail": "Visual search is not enabled on this deployment.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    uploaded = request.FILES.get("image") or request.FILES.get("file")
    if uploaded is None:
        return Response(
            {"error": "missing_image"}, status=status.HTTP_400_BAD_REQUEST
        )

    if uploaded.size > MAX_IMAGE_SIZE_BYTES:
        return Response(
            {"error": "image_too_large", "max_bytes": MAX_IMAGE_SIZE_BYTES},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not (uploaded.content_type or "").startswith("image/"):
        return Response(
            {"error": "not_an_image"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        image_bytes = uploaded.read()
        vec = _query_vector_from_bytes(image_bytes)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Image embedding failed: %s", exc)
        return Response(
            {"error": "embedding_failed", "detail": str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    results = _vector_search(vec, request)
    return Response({"total": len(results), "results": results, "engine": "pgvector"})


@api_view(["GET"])
def visual_search(request):
    """Text -> visually similar products (CLIP multimodal)."""
    if not _vector_enabled():
        return Response(
            {
                "error": "image_search_unavailable",
                "detail": "Visual search is not enabled on this deployment.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    q = (request.GET.get("q") or "").strip()
    if not q:
        return Response(
            {"error": "missing_query"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        vec = _query_vector_from_text(q)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Text embedding failed: %s", exc)
        return Response(
            {"error": "embedding_failed", "detail": str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    results = _vector_search(vec, request)
    return Response({"total": len(results), "results": results, "engine": "pgvector"})


@api_view(["GET"])
def similar_products(request, product_id):
    """PDP widget — products visually similar to a given product."""
    if not _vector_enabled():
        return Response({"results": [], "engine": "disabled"})

    from .models import ProductEmbedding

    try:
        emb = ProductEmbedding.objects.only("product_id", "image_embedding").get(
            product_id=product_id
        )
    except ProductEmbedding.DoesNotExist:
        return Response({"results": [], "engine": "pgvector"})

    if emb.image_embedding is None:
        return Response({"results": [], "engine": "pgvector"})

    results = _vector_search(
        emb.image_embedding,
        request,
        exclude_product_id=product_id,
        limit=MAX_SIMILAR_PRODUCTS,
        threshold=0.6,
    )
    return Response({"results": results, "engine": "pgvector"})


# ─── Vector search core ───────────────────────────────────────────────────────


def _query_vector_from_bytes(data: bytes):
    digest = hashlib.sha256(data).hexdigest()
    cache_key = f"clip_embed:{digest}"
    try:
        cached = cache.get(cache_key)
    except Exception:  # noqa: BLE001
        cached = None
    if cached is not None:
        import numpy as np

        return np.frombuffer(cached, dtype=np.float32)

    from .embedding import embed_image_bytes

    vec = embed_image_bytes(data)
    try:
        cache.set(cache_key, vec.tobytes(), timeout=3600)
    except Exception:  # noqa: BLE001
        pass
    return vec


def _query_vector_from_text(text: str):
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cache_key = f"clip_text_embed:{digest}"
    try:
        cached = cache.get(cache_key)
    except Exception:  # noqa: BLE001
        cached = None
    if cached is not None:
        import numpy as np

        return np.frombuffer(cached, dtype=np.float32)

    from .embedding import embed_text

    vec = embed_text(text)
    try:
        cache.set(cache_key, vec.tobytes(), timeout=3600)
    except Exception:  # noqa: BLE001
        pass
    return vec


def _vector_search(
    query_vector,
    request,
    exclude_product_id: Optional[str] = None,
    limit: int = PAGE_SIZE,
    threshold: float = SIMILARITY_THRESHOLD,
):
    """Cosine similarity over ``ProductEmbedding`` — pgvector SQL when available."""
    from .models import ProductEmbedding

    if HAS_PGVECTOR:
        from pgvector.django import CosineDistance  # type: ignore

        qs = (
            ProductEmbedding.objects.exclude(image_embedding__isnull=True)
            .select_related(
                "product",
                "product__category",
                "product__brand",
                "product__default_variant",
            )
            .annotate(distance=CosineDistance("image_embedding", query_vector))
            .order_by("distance")
        )
        if exclude_product_id:
            qs = qs.exclude(product_id=exclude_product_id)

        results = []
        for emb in qs[: limit * 3]:
            if emb.distance is None:
                continue
            if emb.distance > threshold:
                break
            product_payload = SearchProductSerializer(
                emb.product, context={"request": request}
            ).data
            product_payload["similarity"] = round(1 - float(emb.distance), 3)
            results.append(product_payload)
            if len(results) >= limit:
                break
        return results

    import numpy as np

    q = np.asarray(query_vector, dtype=np.float32).reshape(-1)
    qn = np.linalg.norm(q)
    if qn == 0:
        return []
    q = q / qn

    qs = ProductEmbedding.objects.exclude(image_embedding__isnull=True).select_related(
        "product", "product__category", "product__brand", "product__default_variant"
    )
    if exclude_product_id:
        qs = qs.exclude(product_id=exclude_product_id)

    scored = []
    for emb in qs.iterator(chunk_size=256):
        raw = emb.image_embedding
        if raw is None:
            continue
        v = np.asarray(raw, dtype=np.float32).reshape(-1)
        if v.size != q.size:
            continue
        vn = np.linalg.norm(v)
        if vn == 0:
            continue
        v = v / vn
        distance = 1.0 - float(np.dot(q, v))
        if distance > threshold:
            continue
        scored.append((distance, emb))

    scored.sort(key=lambda x: x[0])

    results = []
    for distance, emb in scored[:limit]:
        product_payload = SearchProductSerializer(
            emb.product, context={"request": request}
        ).data
        product_payload["similarity"] = round(1 - float(distance), 3)
        results.append(product_payload)
    return results


# ─── Admin / health ───────────────────────────────────────────────────────────


@api_view(["GET"])
def health(request):
    """
    Public health probe — does not require auth.

    Used by the Stores-Admin search dashboard to show which subsystems are up.
    """
    return Response(
        {
            "elasticsearch": {
                "enabled": _es_enabled(),
                "library_installed": HAS_ELASTICSEARCH,
                "url": getattr(settings, "ELASTICSEARCH_URL", None),
            },
            "embeddings": {
                "enabled": _vector_enabled(),
                "library_installed": HAS_PGVECTOR,
                "service_url": getattr(settings, "EMBEDDING_SERVICE_URL", None),
            },
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def admin_stats(request):
    """Admin-only — counts used by the admin search dashboard."""
    from .models import ProductEmbedding

    products_total = Product.objects.count()
    embeddings_total = ProductEmbedding.objects.exclude(
        image_embedding__isnull=True
    ).count()

    coverage = (
        round((embeddings_total / products_total) * 100, 2)
        if products_total > 0
        else 0.0
    )

    return Response(
        {
            "products_total": products_total,
            "embeddings_total": embeddings_total,
            "embedding_coverage_pct": coverage,
            "elasticsearch_enabled": _es_enabled(),
            "embeddings_enabled": _vector_enabled(),
        }
    )
