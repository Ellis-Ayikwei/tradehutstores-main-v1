"""Serializers. Read serializers are ``BaseSerializer`` subclasses fed by the annotated
querysets in ``queries`` (no per-row queries); write serializers validate the S2/S4 body."""

from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from . import services
from .constants import (
    MAX_DURATION,
    MAX_SOFT_CLOSE_SECONDS,
    MAX_START_AHEAD,
    MIN_DURATION,
    RECENT_BIDS,
    SELLER_BID_LIST,
    START_GRACE,
)
from .models import Bid, compute_my_status

MONEY = dict(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))


def money(value):
    return None if value is None else str(services.q2(value))


def iso(value):
    return None if value is None else value.isoformat()


def _now(serializer):
    return serializer.context.setdefault("now", timezone.now())


def _viewer_id(serializer):
    request = serializer.context.get("request")
    user = getattr(request, "user", None)
    return user.id if user is not None and user.is_authenticated else None


def _file_url(f, request):
    if not f or not getattr(f, "name", None):
        return None
    try:
        url = f.url
    except ValueError:
        return None
    if request is not None and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


def _image_urls(auction, request):
    """Variant images (main first), then product main image, then product gallery."""
    seen, urls = set(), []
    candidates = [img.image for img in auction.variant.product_variant_images.all()]
    candidates.append(auction.variant.product.main_product_image)
    candidates.extend(img.image for img in auction.variant.product.product_images.all())
    for f in candidates:
        url = _file_url(f, request)
        if url and url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def seller_payload(seller, *, with_rating=False):
    data = {
        "id": str(seller.id),
        "business_name": seller.business_name,
        "store_slug": seller.store_slug,
        "is_verified": seller.verification_status == "verified",
    }
    if with_rating:
        data["rating"] = str(seller.rating)
    return data


def _my_status(serializer, a):
    uid = _viewer_id(serializer)
    if uid is None:
        return None
    return compute_my_status(
        a,
        user_id=uid,
        has_bid=getattr(a, "ann_my_high", None) is not None,
        leader_id=getattr(a, "ann_leader_id", None),
    )


class AuctionCardSerializer(serializers.BaseSerializer):
    def to_representation(self, a):
        now = _now(self)
        request = self.context.get("request")
        images = _image_urls(a, request)
        buy_now = a.buy_now_available(now)
        return {
            "id": str(a.id),
            "title": a.title,
            "image": images[0] if images else None,
            "currency": a.currency,
            "starting_price": money(a.starting_price),
            "current_price": money(a.current_price),
            "next_min_bid": money(a.next_min_bid()),
            "bid_count": a.bid_count,
            "buy_now_price": money(a.buy_now_price) if buy_now else None,
            "buy_now_available": buy_now,
            "starts_at": iso(a.starts_at),
            "ends_at": iso(a.ends_at),
            "display_status": a.display_status(now),
            "reserve_met": a.reserve_met(),
            "seller": seller_payload(a.seller),
            "product_id": str(a.variant.product_id),
            "is_watching": bool(getattr(a, "ann_is_watching", False)),
        }


class MyBiddingSerializer(AuctionCardSerializer):
    def to_representation(self, a):
        data = super().to_representation(a)
        data["my_status"] = _my_status(self, a)
        data["my_highest_bid"] = money(getattr(a, "ann_my_high", None))
        won = a.status == a.STATUS_ENDED and a.winner_id == _viewer_id(self)
        data["order_id"] = str(a.order_id) if won and a.order_id else None
        data["order_payment_status"] = (
            getattr(a, "order_info", {}).get("payment_status") if won and a.order_id else None
        )
        return data


def state_payload(serializer, a):
    now = _now(serializer)
    is_winner = a.status == a.STATUS_ENDED and a.winner_id is not None and a.winner_id == _viewer_id(serializer)
    buy_now = a.buy_now_available(now)
    leader = a.leading_bid.bidder if a.leading_bid_id else None
    return {
        "id": str(a.id),
        "status": a.status,
        "display_status": a.display_status(now),
        "currency": a.currency,
        "starting_price": money(a.starting_price),
        "current_price": money(a.current_price),
        "min_increment": money(a.min_increment),
        "next_min_bid": money(a.next_min_bid()),
        "bid_count": a.bid_count,
        "starts_at": iso(a.starts_at),
        "ends_at": iso(a.ends_at),
        "reserve_met": a.reserve_met(),
        "buy_now_price": money(a.buy_now_price) if buy_now else None,
        "buy_now_available": buy_now,
        "leading_bidder": services.mask_name(leader) if leader else None,
        "my_status": _my_status(serializer, a),
        "my_highest_bid": money(getattr(a, "ann_my_high", None)),
        "is_watching": bool(getattr(a, "ann_is_watching", False)),
        "result": a.result,
        "order_id": str(a.order_id) if is_winner and a.order_id else None,
        "settlement_status": a.settlement_status if is_winner else None,
        "payment_due_at": iso(a.payment_due_at) if is_winner else None,
        "server_time": now.isoformat(),
    }


class AuctionStateSerializer(serializers.BaseSerializer):
    def to_representation(self, a):
        return state_payload(self, a)


def detail_payload(serializer, a):
    request = serializer.context.get("request")
    product = a.variant.product
    category = getattr(product, "category", None)
    data = state_payload(serializer, a)
    recent = a.bids.select_related("bidder").order_by("-amount")[:RECENT_BIDS]
    uid = _viewer_id(serializer)
    data.update(
        {
            "title": a.title,
            "description": a.description,
            "quantity": a.quantity,
            "soft_close_seconds": a.soft_close_seconds,
            "images": _image_urls(a, request),
            "product": {
                "id": str(product.id),
                "name": product.name,
                "slug": product.slug,
                "category": {"id": str(category.id), "name": category.name} if category else None,
            },
            "variant": {
                "id": str(a.variant_id),
                "sku": a.variant.sku,
                "name": a.variant.name,
                "attributes": [
                    {"name": av.attribute.name if av.attribute else None, "value": av.value_name}
                    for av in a.variant.attribute_values.all()
                ],
            },
            "seller": seller_payload(a.seller, with_rating=True),
            "recent_bids": [bid_row(b, uid) for b in recent],
            "watch_count": a.watches.count(),
        }
    )
    return data


class AuctionDetailSerializer(serializers.BaseSerializer):
    def to_representation(self, a):
        return detail_payload(self, a)


def bid_row(b, viewer_id):
    return {
        "amount": money(b.amount),
        "bidder": services.mask_name(b.bidder),
        "placed_at": iso(b.placed_at),
        "is_me": viewer_id is not None and b.bidder_id == viewer_id,
        "is_buy_now": b.is_buy_now,
    }


class BidRowSerializer(serializers.BaseSerializer):
    def to_representation(self, b):
        return bid_row(b, _viewer_id(self))


def _order_fields(a):
    info = getattr(a, "order_info", {})
    return {
        "order_id": str(a.order_id) if a.order_id else None,
        "order_status": info.get("order_status"),
        "payment_status": info.get("payment_status"),
    }


class SellerAuctionRowSerializer(AuctionCardSerializer):
    def to_representation(self, a):
        data = super().to_representation(a)
        data.update(
            {
                "status": a.status,
                # The seller always sees their own buy-now price; buyers only while it can be used.
                "buy_now_price": money(a.buy_now_price),
                "reserve_price": money(a.reserve_price),
                "result": a.result,
                "winner_display": services.seller_bidder_display(a.winner) if a.winner_id else None,
                "original_ends_at": iso(a.original_ends_at),
                "settlement_status": a.settlement_status,
                "payment_due_at": iso(a.payment_due_at),
                **_order_fields(a),
            }
        )
        return data


class SellerAuctionDetailSerializer(serializers.BaseSerializer):
    def to_representation(self, a):
        data = detail_payload(self, a)
        bids = a.bids.select_related("bidder").order_by("-amount")[:SELLER_BID_LIST]
        data.update(
            {
                "buy_now_price": money(a.buy_now_price),
                "reserve_price": money(a.reserve_price),
                "original_ends_at": iso(a.original_ends_at),
                "winner_display": services.seller_bidder_display(a.winner) if a.winner_id else None,
                "order_id": str(a.order_id) if a.order_id else None,
                "settlement_status": a.settlement_status,
                "payment_due_at": iso(a.payment_due_at),
                "cancel_reason": a.cancel_reason,
                "bids": [
                    {
                        "amount": money(b.amount),
                        "bidder_display": services.seller_bidder_display(b.bidder),
                        "placed_at": iso(b.placed_at),
                        "is_buy_now": b.is_buy_now,
                    }
                    for b in bids
                ],
            }
        )
        data.update({k: v for k, v in _order_fields(a).items() if k != "order_id"})
        return data


# --------------------------------------------------------------------------- input


class BidInputSerializer(serializers.Serializer):
    amount = serializers.DecimalField(**MONEY)


class CancelInputSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


class AuctionWriteSerializer(serializers.Serializer):
    """S2 body (create) and S4 body (``partial=True`` with ``instance``)."""

    variant_id = serializers.UUIDField(required=False)
    quantity = serializers.IntegerField(required=False, min_value=1)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    starting_price = serializers.DecimalField(**MONEY)
    min_increment = serializers.DecimalField(**MONEY)
    reserve_price = serializers.DecimalField(required=False, allow_null=True, **MONEY)
    buy_now_price = serializers.DecimalField(required=False, allow_null=True, **MONEY)
    starts_at = serializers.DateTimeField(required=False)
    ends_at = serializers.DateTimeField()
    soft_close_seconds = serializers.IntegerField(
        required=False, min_value=0, max_value=MAX_SOFT_CLOSE_SECONDS
    )

    def validate(self, attrs):
        editing = self.instance is not None
        if editing:
            locked = [f for f in ("variant_id", "quantity") if f in self.initial_data]
            if locked:
                raise serializers.ValidationError({f: "Cannot be changed." for f in locked})
        elif "variant_id" not in attrs:
            raise serializers.ValidationError({"variant_id": "This field is required."})

        now = timezone.now()

        def value(name):
            if name in attrs:
                return attrs[name]
            return getattr(self.instance, name, None) if editing else None

        start = value("starting_price")
        reserve = value("reserve_price")
        buy_now = value("buy_now_price")
        errors = {}
        if reserve is not None and reserve < start:
            errors["reserve_price"] = "Must be at least the starting price."
        if buy_now is not None and buy_now <= max(start, reserve or start):
            errors["buy_now_price"] = "Must be greater than the starting and reserve prices."

        starts_at = attrs.get("starts_at") or (None if editing else now)
        if starts_at is not None and not (now - START_GRACE <= starts_at <= now + MAX_START_AHEAD):
            errors["starts_at"] = "Must be within 5 minutes ago and 30 days ahead."
        effective_start = starts_at or self.instance.starts_at
        ends_at = value("ends_at")
        duration = ends_at - effective_start
        if duration < MIN_DURATION or duration > MAX_DURATION:
            errors["ends_at"] = "Duration must be between 1 hour and 14 days."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
