"""Read-side querysets (N+1-free) for the auction endpoints."""

from uuid import UUID

from django.db.models.functions import Coalesce
from django.db.models import BooleanField, DecimalField, Exists, F, OuterRef, Prefetch, Q, Subquery, Value
from django.utils import timezone

from apps.products.models import ProductImage

from .constants import ENDING_SOON
from .errors import ApiError
from .models import Auction, AuctionWatch, Bid

LIST_STATUSES = ("live", "ending_soon", "scheduled", "ended")
SORTS = {
    "ending_soonest": ("ends_at",),
    "newest": ("-created_on",),
    "price_asc": ("current_price_sort", "ends_at"),
    "price_desc": ("-current_price_sort", "ends_at"),
    "most_bids": ("-bid_count", "ends_at"),
}
MY_STATUSES = ("winning", "outbid", "won", "lost")


def _image_qs():
    return ProductImage.objects.exclude(image="").exclude(image__isnull=True)


def with_images(qs):
    return qs.select_related("seller", "variant__product").prefetch_related(
        Prefetch("variant__product_variant_images", queryset=_image_qs()),
        Prefetch("variant__product__product_images", queryset=_image_qs()),
    )


def annotate_viewer(qs, user):
    """Add ``ann_is_watching``, ``ann_my_high``, ``ann_leader_id`` (no per-row queries)."""
    qs = qs.select_related("leading_bid").annotate(ann_leader_id=F("leading_bid__bidder_id"))
    if user is not None and user.is_authenticated:
        return qs.annotate(
            ann_is_watching=Exists(
                AuctionWatch.objects.filter(auction=OuterRef("pk"), user=user)
            ),
            ann_my_high=Subquery(
                Bid.objects.filter(auction=OuterRef("pk"), bidder=user)
                .order_by("-amount")
                .values("amount")[:1]
            ),
        )
    return qs.annotate(
        ann_is_watching=Value(False, output_field=BooleanField()),
        ann_my_high=Value(None, output_field=DecimalField(max_digits=12, decimal_places=2)),
    )


def visible_to(qs, user):
    """Public visibility: verified+active sellers only; cancelled only for the owner."""
    public = Q(seller__verification_status="verified", seller__is_active=True) & ~Q(
        status=Auction.STATUS_CANCELLED
    )
    if user is not None and user.is_authenticated:
        return qs.filter(public | Q(seller__user=user))
    return qs.filter(public)


def _with_detail_relations(qs):
    return qs.select_related(
        "leading_bid__bidder", "variant__product__category", "winner"
    ).prefetch_related("variant__attribute_values__attribute")


def public_detail_queryset(user):
    qs = annotate_viewer(with_images(Auction.objects.all()), user)
    return _with_detail_relations(visible_to(qs, user))


def seller_detail_queryset(seller, user):
    qs = annotate_viewer(with_images(Auction.objects.filter(seller=seller)), user)
    return _with_detail_relations(qs)


def _parse_uuid(value, name):
    try:
        return UUID(str(value))
    except ValueError:
        raise ApiError(400, "bad_filter", f"Invalid {name}.")


def filter_by_display_status(qs, status, now=None):
    now = now or timezone.now()
    running = Q(status__in=[Auction.STATUS_SCHEDULED, Auction.STATUS_LIVE], starts_at__lte=now, ends_at__gt=now)
    if status == "live":
        return qs.filter(running, ends_at__gt=now + ENDING_SOON)
    if status == "ending_soon":
        return qs.filter(running, ends_at__lte=now + ENDING_SOON)
    if status == "scheduled":
        return qs.filter(status=Auction.STATUS_SCHEDULED, starts_at__gt=now)
    if status == "ended":
        return qs.filter(
            Q(status=Auction.STATUS_ENDED)
            | Q(status__in=[Auction.STATUS_SCHEDULED, Auction.STATUS_LIVE], ends_at__lte=now)
        )
    raise ApiError(400, "bad_filter", "Invalid status filter.")


def apply_list_params(qs, params, *, default_sort="ending_soonest"):
    status = params.get("status")
    if status:
        qs = filter_by_display_status(qs, status)
    category = params.get("category")
    if category:
        qs = qs.filter(variant__product__category_id=_parse_uuid(category, "category"))
    seller = params.get("seller")
    if seller:
        qs = qs.filter(seller_id=_parse_uuid(seller, "seller"))
    q = (params.get("q") or "").strip()
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(variant__product__name__icontains=q))
    sort = params.get("sort") or default_sort
    if sort not in SORTS:
        raise ApiError(400, "bad_filter", "Invalid sort.")
    if sort in ("price_asc", "price_desc"):
        qs = qs.annotate(current_price_sort=Coalesce("current_price", "starting_price"))
    return qs.order_by(*SORTS[sort], "id")


def public_list_queryset(user, params):
    qs = visible_to(annotate_viewer(with_images(Auction.objects.all()), user), user)
    qs = qs.exclude(status=Auction.STATUS_CANCELLED)
    return apply_list_params(qs, params)


def my_bidding_queryset(user, params):
    qs = annotate_viewer(with_images(Auction.objects.all()), user)
    qs = qs.filter(ann_my_high__isnull=False).exclude(status=Auction.STATUS_CANCELLED)
    my = params.get("my_status")
    if my:
        if my not in MY_STATUSES:
            raise ApiError(400, "bad_filter", "Invalid my_status filter.")
        open_ = ~Q(status=Auction.STATUS_ENDED)
        if my == "winning":
            qs = qs.filter(open_, leading_bid__bidder=user)
        elif my == "outbid":
            qs = qs.filter(open_).exclude(leading_bid__bidder=user)
        elif my == "won":
            qs = qs.filter(status=Auction.STATUS_ENDED, winner=user)
        else:
            qs = qs.filter(status=Auction.STATUS_ENDED).exclude(winner=user)
    return qs.order_by("-ends_at", "id")


def my_watching_queryset(user):
    qs = annotate_viewer(with_images(Auction.objects.all()), user)
    qs = visible_to(qs, user).filter(watches__user=user).exclude(status=Auction.STATUS_CANCELLED)
    return qs.order_by("ends_at", "id")


def seller_queryset(seller, user, params):
    qs = annotate_viewer(with_images(Auction.objects.filter(seller=seller)), user).select_related(
        "winner"
    )
    status = params.get("status")
    if status == "cancelled":
        qs = qs.filter(status=Auction.STATUS_CANCELLED)
    elif status:
        qs = filter_by_display_status(qs, status)
    q = (params.get("q") or "").strip()
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(variant__product__name__icontains=q))
    return qs.order_by("-created_on", "id")


def attach_order_info(auctions):
    """Set ``a.order_info`` ({order_status, payment_status}) with one batched query.

    Kept off the main querysets so polling endpoints never join ``orders``; ``payment_status``
    is read only if the Order model has it (added by BE-ORD-1).
    """
    from apps.orders.models import Order

    auctions = list(auctions)
    ids = {a.order_id for a in auctions if a.order_id}
    info = {}
    if ids:
        fields = ["id", "order_status"]
        if any(f.name == "payment_status" for f in Order._meta.get_fields()):
            fields.append("payment_status")
        info = {row["id"]: row for row in Order.objects.filter(pk__in=ids).values(*fields)}
    for a in auctions:
        a.order_info = info.get(a.order_id, {})
    return auctions
