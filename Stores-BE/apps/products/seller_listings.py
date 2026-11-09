"""``GET products/seller/`` - the requesting seller's own listings (plan 20 section 6).

The queryset is scoped to ``seller_profile`` here, never in the client. Variants and images
are prefetched, so a page of rows costs a fixed number of queries.
"""

from django.conf import settings
from django.db.models import Exists, OuterRef, Prefetch, Q, Subquery
from django.db.models.functions import Coalesce
from rest_framework import serializers

from .models import PRODUCT_STATUS, Product, ProductImage, ProductVariant
from .serializers import product_display_image, product_variant_rows

LOW_STOCK_THRESHOLD = 5
NOT_FOR_SALE_STATUSES = ("Archived", "Deleted")
VALID_STATUSES = {value for value, _ in PRODUCT_STATUS}

# `ordering` value -> order_by expression(s). Names match Stores-Seller/lib/seller/listings.ts.
ORDERINGS = {
    "name": ("name",),
    "-name": ("-name",),
    "updated_at": ("updated_at",),
    "-updated_at": ("-updated_at",),
    "price": ("primary_price",),
    "-price": ("-primary_price",),
}
DEFAULT_ORDERING = "-updated_at"


def _cheapest_variant_price(product_ref):
    return Subquery(
        ProductVariant.objects.filter(product=OuterRef(product_ref))
        .order_by("price", "sku")
        .values("price")[:1]
    )


def seller_listings_queryset(seller, params):
    """Filter + order the seller's products from query ``params`` (a QueryDict-like)."""
    status = (params.get("status") or "").strip()
    if status and status not in VALID_STATUSES:
        raise serializers.ValidationError({"status": [f"Unknown status '{status}'."]})
    ordering = (params.get("ordering") or DEFAULT_ORDERING).strip()
    if ordering not in ORDERINGS:
        raise serializers.ValidationError(
            {"ordering": [f"Use one of: {', '.join(sorted(ORDERINGS))}."]}
        )

    qs = Product.objects.filter(seller_profile=seller)
    if status:
        qs = qs.filter(status=status)
    elif (params.get("low_stock") or "").lower() in ("true", "1"):
        qs = qs.exclude(status__in=NOT_FOR_SALE_STATUSES)
    else:
        qs = qs.exclude(status="Deleted")

    if (params.get("low_stock") or "").lower() in ("true", "1"):
        qs = qs.filter(
            Exists(
                ProductVariant.objects.filter(
                    product=OuterRef("pk"), quantity__lte=LOW_STOCK_THRESHOLD
                )
            )
        )

    q = (params.get("q") or "").strip()
    if q:
        qs = qs.filter(
            Q(name__icontains=q)
            | Exists(ProductVariant.objects.filter(product=OuterRef("pk"), sku__icontains=q))
        )

    qs = qs.annotate(
        primary_price=Coalesce(
            Subquery(
                ProductVariant.objects.filter(pk=OuterRef("default_variant_id")).values("price")[:1]
            ),
            _cheapest_variant_price("pk"),
        )
    )
    return (
        qs.select_related("category")
        .prefetch_related(
            Prefetch(
                "variants", queryset=ProductVariant.objects.order_by("price", "sku")
            ),
            Prefetch(
                "product_images",
                queryset=ProductImage.objects.exclude(image="")
                .exclude(image__isnull=True)
                .order_by("-is_main", "created_at"),
            ),
        )
        .order_by(*ORDERINGS[ordering], "id")
    )


def listing_row(product, request=None):
    variants = product_variant_rows(product)
    # Primary variant: the product's default, else the cheapest (variants arrive price-sorted;
    # BaseModel.created_at is auto_now so there is no reliable "first created").
    primary = next((v for v in variants if v.pk == product.default_variant_id), None) or (
        variants[0] if variants else None
    )
    image = product_display_image(product)
    image_url = None
    if image:
        try:
            image_url = image.url
        except ValueError:
            image_url = None
        if image_url and request is not None:
            image_url = request.build_absolute_uri(image_url)
    return {
        "id": str(product.pk),
        "name": product.name,
        "status": product.status,
        "main_product_image": image_url,
        "category_name": product.category.name if product.category_id else None,
        "pricing_currency": str(
            getattr(settings, "TRADEHUT_STORE_BASE_CURRENCY", "GHS")
        ).upper(),
        "primary_sku": primary.sku if primary else None,
        "primary_variant_price": str(primary.price) if primary else None,
        "variant_stock_total": sum((v.quantity or 0) for v in variants),
        # Product.free_shipping lands with the plan 20 section 6 migration; until then False.
        "free_shipping": bool(getattr(product, "free_shipping", False)),
        "updated_at": product.updated_at,
        "variants": [
            {
                "id": str(v.pk),
                "sku": v.sku,
                "price": str(v.price),
                "quantity": v.quantity,
                "name": (v.name or "").strip() or None,
            }
            for v in variants
        ],
    }
