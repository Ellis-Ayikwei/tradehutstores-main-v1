"""Input validation (``Serializer``) and output payloads (``BaseSerializer``) for the RFQ API.

Output serializers read only what the selectors prefetched, so list and detail endpoints run a
fixed number of queries. A supplier payload is built from the supplier's own quote only.
"""

from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.auctions.services import q2, seller_bidder_display

from .constants import MAX_DESCRIPTION, MAX_NOTES, MAX_QUANTITY, MAX_SPECS

MONEY = dict(max_digits=14, decimal_places=2, min_value=Decimal("0"))


def money(value):
    return None if value is None else str(q2(value))


def iso(value):
    return None if value is None else value.isoformat()


def file_url(f, request):
    if not f or not getattr(f, "name", None):
        return None
    try:
        url = f.url
    except ValueError:
        return None
    if request is not None and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


# --------------------------------------------------------------------------- input


class SpecSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=100)
    value = serializers.CharField(max_length=300)


class RFQWriteSerializer(serializers.Serializer):
    """R2 body; R4 body when used with ``partial=True``."""

    title = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=MAX_DESCRIPTION)
    category_id = serializers.UUIDField()
    sub_category_id = serializers.UUIDField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_QUANTITY)
    unit = serializers.CharField(required=False, max_length=32)
    budget_min = serializers.DecimalField(required=False, allow_null=True, **MONEY)
    budget_max = serializers.DecimalField(required=False, allow_null=True, **MONEY)
    delivery_country = serializers.RegexField(r"^[A-Za-z]{2}$", error_messages={"invalid": "Use a 2-letter country code."})
    delivery_city = serializers.CharField(required=False, allow_blank=True, max_length=120)
    needed_by = serializers.DateField(required=False, allow_null=True)
    closes_at = serializers.DateTimeField()
    specs = SpecSerializer(many=True, required=False, max_length=MAX_SPECS)
    publish = serializers.BooleanField(required=False, default=False)

    def validate_delivery_country(self, value):
        return value.upper()

    def validate_needed_by(self, value):
        if value is not None and value < timezone.localdate():
            raise serializers.ValidationError("Choose a date that is not in the past.")
        return value

    def validate_closes_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("The quote deadline must be in the future.")
        return value

    def validate(self, attrs):
        low, high = attrs.get("budget_min"), attrs.get("budget_max")
        if low is not None and high is not None and low > high:
            raise serializers.ValidationError(
                {"budget_max": "Maximum budget must not be below the minimum."}
            )
        if "specs" in attrs:
            attrs["specs"] = [dict(s) for s in attrs["specs"]]
        return attrs


class CancelInputSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


class AwardInputSerializer(serializers.Serializer):
    quote_id = serializers.UUIDField()


class QuoteWriteSerializer(serializers.Serializer):
    """Q3 body; Q4 body when used with ``partial=True``."""

    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    shipping_cost = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0"), required=False, default=Decimal("0")
    )
    lead_time_days = serializers.IntegerField(min_value=1, max_value=365)
    valid_until = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=MAX_NOTES)
    product_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_valid_until(self, value):
        if value is not None and value <= timezone.now():
            raise serializers.ValidationError("The offer must stay valid beyond now.")
        return value


# --------------------------------------------------------------------------- output


def category_payload(c):
    return {"id": str(c.id), "name": c.name}


def attachment_payload(a, request):
    return {"id": str(a.id), "filename": a.filename, "url": file_url(a.file, request), "size": a.size}


def product_payload(p, request):
    return (
        None
        if p is None
        else {"id": str(p.id), "name": p.name, "image": file_url(p.main_product_image, request)}
    )


def quote_money(q):
    return {
        "unit_price": money(q.unit_price),
        "quantity": q.quantity,
        "total_price": money(q.total_price),
        "shipping_cost": money(q.shipping_cost),
        "grand_total": money(q.grand_total),
        "currency": q.currency,
        "lead_time_days": q.lead_time_days,
        "valid_until": iso(q.valid_until),
        "notes": q.notes,
        "status": q.status,
        "submitted_at": iso(q.submitted_at),
    }


def rfq_row(r):
    return {
        "id": str(r.id),
        "reference": r.reference,
        "title": r.title,
        "category": category_payload(r.category),
        "quantity": r.quantity,
        "unit": r.unit,
        "status": r.status,
        "quote_count": r.quote_count,
        "closes_at": iso(r.closes_at),
        "awarded_quote_id": str(r.awarded_quote_id) if r.awarded_quote_id else None,
        "order_id": str(r.order_id) if r.order_id else None,
        "created_on": iso(r.created_on),
    }


class RFQRowSerializer(serializers.BaseSerializer):
    """R1."""

    def to_representation(self, r):
        return rfq_row(r)


class RFQDetailSerializer(serializers.BaseSerializer):
    """R3 (buyer view): needs ``buyer_detail_queryset`` prefetches."""

    def to_representation(self, r):
        request = self.context.get("request")
        data = rfq_row(r)
        data.update(
            {
                "sub_category": (
                    None
                    if r.sub_category is None
                    else {"id": str(r.sub_category.id), "name": r.sub_category.sub_category_name}
                ),
                "description": r.description,
                "budget_min": money(r.budget_min),
                "budget_max": money(r.budget_max),
                "currency": r.currency,
                "delivery_country": r.delivery_country,
                "delivery_city": r.delivery_city,
                "needed_by": r.needed_by.isoformat() if r.needed_by else None,
                "specs": r.specs,
                "attachments": [attachment_payload(a, request) for a in r.attachments.all()],
                "quotes": (
                    [] if r.status == r.STATUS_DRAFT else [buyer_quote(q, request) for q in r.buyer_quotes]
                ),
            }
        )
        return data


def buyer_quote(q, request):
    s = q.supplier
    return {
        "id": str(q.id),
        "supplier": {
            "id": str(s.id),
            "business_name": s.business_name,
            "store_slug": s.store_slug,
            "is_verified": s.verification_status == "verified",
            "rating": str(s.rating),
        },
        "product": product_payload(q.product, request),
        **quote_money(q),
    }


def supplier_quote(q, request):
    """The supplier's own quote, with its RFQ summary and (once accepted) the order id."""
    r = q.rfq
    return {
        "id": str(q.id),
        "rfq": {
            "id": str(r.id),
            "reference": r.reference,
            "title": r.title,
            "status": r.status,
            "closes_at": iso(r.closes_at),
        },
        "product": product_payload(q.product, request),
        **quote_money(q),
        "order_id": str(r.order_id) if q.status == q.STATUS_ACCEPTED and r.order_id else None,
    }


class SupplierQuoteSerializer(serializers.BaseSerializer):
    """Q3 / Q4 / Q5 / Q6 rows."""

    def to_representation(self, q):
        return supplier_quote(q, self.context.get("request"))


def match_row(r):
    return {
        "id": str(r.id),
        "reference": r.reference,
        "title": r.title,
        "category": category_payload(r.category),
        "quantity": r.quantity,
        "unit": r.unit,
        "budget_min": money(r.budget_min),
        "budget_max": money(r.budget_max),
        "currency": r.currency,
        "delivery_country": r.delivery_country,
        "delivery_city": r.delivery_city,
        "closes_at": iso(r.closes_at),
        "quote_count": r.quote_count,
        "status": r.status,
        "my_quote_status": getattr(r, "my_quote_status", None),
    }


class MatchRowSerializer(serializers.BaseSerializer):
    """Q1."""

    def to_representation(self, r):
        return match_row(r)


class MatchDetailSerializer(serializers.BaseSerializer):
    """Q2. ``my_quote`` is passed in context; the buyer is shown as first name + last initial."""

    def to_representation(self, r):
        request = self.context.get("request")
        my_quote = self.context.get("my_quote")
        data = match_row(r)
        data.update(
            {
                "description": r.description,
                "specs": r.specs,
                "needed_by": r.needed_by.isoformat() if r.needed_by else None,
                "attachments": [attachment_payload(a, request) for a in r.attachments.all()],
                "buyer": {
                    "display_name": seller_bidder_display(r.buyer),
                    "city": r.delivery_city,
                    "country": r.delivery_country,
                    "member_since": iso(r.buyer.date_joined),
                },
                "my_quote": supplier_quote(my_quote, request) if my_quote else None,
            }
        )
        return data
