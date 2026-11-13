"""Read-side querysets for the RFQ endpoints. Every queryset is scoped to the caller."""

from uuid import UUID

from django.db.models import Exists, F, OuterRef, Prefetch, Q, Subquery
from django.utils import timezone

from apps.auctions.errors import ApiError
from apps.catalog.models import Category

from .models import RFQ, Quote

LISTING_STATUSES = ("Active", "Published")
LIVE_STATUSES = (RFQ.STATUS_OPEN, RFQ.STATUS_QUOTING)


def parse_uuid(value, name):
    try:
        return UUID(str(value))
    except ValueError:
        raise ApiError(400, "bad_filter", f"Invalid {name}.")


def seller_categories(seller):
    """Categories the seller declared plus the categories of their active listings (README D8)."""
    return Category.objects.filter(
        Q(seller_profiles=seller)
        | Q(product__seller_profile=seller, product__status__in=LISTING_STATUSES)
    ).distinct()


def matching(seller) -> Q:
    """RFQs in one of the seller's categories, never the seller's own request."""
    return Q(category__in=seller_categories(seller)) & ~Q(buyer_id=seller.user_id)


def _my_quote_status(seller):
    return Subquery(
        Quote.objects.filter(rfq=OuterRef("pk"), supplier=seller).values("status")[:1]
    )


# --------------------------------------------------------------------------- buyer


def buyer_list_queryset(user, params):
    qs = RFQ.objects.filter(buyer=user).select_related("category")
    status = params.get("status")
    if status:
        if status not in dict(RFQ.STATUS_CHOICES):
            raise ApiError(400, "bad_filter", "Invalid status filter.")
        qs = qs.filter(status=status)
    return qs.order_by("-created_on", "id")


def buyer_detail_queryset(user):
    """The buyer's own requests with attachments and comparable quotes (no withdrawn ones)."""
    quotes = (
        Quote.objects.exclude(status=Quote.STATUS_WITHDRAWN)
        .select_related("supplier", "product")
        .annotate(grand=F("total_price") + F("shipping_cost"))
        .order_by("grand", "id")
    )
    return (
        RFQ.objects.filter(buyer=user)
        .select_related("category", "sub_category")
        .prefetch_related("attachments", Prefetch("quotes", queryset=quotes, to_attr="buyer_quotes"))
    )


# --------------------------------------------------------------------------- supplier


def matches_queryset(seller, params):
    """Q1: live, matching RFQs whose quote window is still open."""
    qs = (
        RFQ.objects.filter(matching(seller), status__in=LIVE_STATUSES, closes_at__gt=timezone.now())
        .select_related("category")
        .annotate(my_quote_status=_my_quote_status(seller))
    )
    category = params.get("category")
    if category:
        qs = qs.filter(category_id=parse_uuid(category, "category"))
    q = (params.get("q") or "").strip()
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
    return qs.order_by("closes_at", "id")


def match_detail_queryset(seller):
    """Q2: matching RFQs plus any RFQ the seller has quoted on, whatever its state."""
    quoted = Exists(Quote.objects.filter(rfq=OuterRef("pk"), supplier=seller))
    return (
        RFQ.objects.filter(
            (matching(seller) & Q(status__in=LIVE_STATUSES)) | Q(quoted),
        )
        .select_related("category", "buyer")
        .prefetch_related("attachments")
        .annotate(my_quote_status=_my_quote_status(seller))
    )


def seller_quotes_queryset(seller, params):
    qs = Quote.objects.filter(supplier=seller).select_related("rfq", "product")
    status = params.get("status")
    if status:
        if status not in dict(Quote.STATUS_CHOICES):
            raise ApiError(400, "bad_filter", "Invalid status filter.")
        qs = qs.filter(status=status)
    return qs.order_by("-created_on", "id")
