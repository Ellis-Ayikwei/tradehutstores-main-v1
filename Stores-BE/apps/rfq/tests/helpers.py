"""Test factories. Rows are created through the ORM so tests control time and state."""

import itertools
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APIClient

from apps.auctions.tests.helpers import make_seller, make_user  # noqa: F401 - re-exported for the tests
from apps.catalog.models import Brand, Category, SubCategory
from apps.products.models import Product
from apps.rfq.models import RFQ, Quote

BASE = "/tradehut/api/v1/rfq/"
_seq = itertools.count(1)


def make_category(name=None):
    return Category.objects.create(name=name or f"Category {next(_seq)}")


def make_listing(seller, category, status="Active"):
    """An active listing of ``seller`` in ``category`` (this is what makes the seller a match)."""
    n = next(_seq)
    sub = SubCategory.objects.create(sub_category_name=f"Sub {n}", category=category)
    brand = Brand.objects.create(name=f"Brand {n}", category=category)
    return Product.objects.create(
        name=f"Product {n}",
        keywords="k",
        category=category,
        sub_category=sub,
        brand=brand,
        seller=seller.user,
        seller_profile=seller,
        status=status,
    )


def make_supplier(category, label="supplier", *, status="verified"):
    """A seller with an active listing in ``category``."""
    seller = make_seller(label, status=status)
    make_listing(seller, category)
    return seller


def make_rfq(buyer, category, **overrides):
    now = timezone.now()
    n = next(_seq)
    fields = dict(
        reference=f"RFQ-T{n:07d}",
        buyer=buyer,
        title="Office chairs",
        description="Need ergonomic chairs.",
        category=category,
        quantity=10,
        currency="GHS",
        delivery_country="GH",
        closes_at=now + timedelta(days=3),
        status=RFQ.STATUS_OPEN,
        published_at=now,
        create_idempotency_key=f"k{n}",
    )
    fields.update(overrides)
    return RFQ.objects.create(**fields)


def make_quote(rfq, supplier, *, unit_price="20.00", shipping="5.00", status=Quote.STATUS_SUBMITTED, **overrides):
    """A quote row; keeps ``rfq.quote_count`` and ``rfq.status`` consistent like the service does."""
    unit = Decimal(unit_price)
    fields = dict(
        rfq=rfq,
        supplier=supplier,
        unit_price=unit,
        quantity=rfq.quantity,
        total_price=unit * rfq.quantity,
        shipping_cost=Decimal(shipping),
        currency=rfq.currency,
        lead_time_days=7,
        status=status,
        submitted_at=timezone.now(),
        idempotency_key=f"q{next(_seq)}",
    )
    fields.update(overrides)
    quote = Quote.objects.create(**fields)
    rfq.quote_count = rfq.quotes.exclude(status=Quote.STATUS_WITHDRAWN).count()
    if rfq.status == RFQ.STATUS_OPEN:
        rfq.status = RFQ.STATUS_QUOTING
    rfq.save(update_fields=["quote_count", "status"])
    return quote


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def create_payload(category, **overrides):
    body = {
        "title": "Office chairs",
        "description": "Need 10 ergonomic chairs.",
        "category_id": str(category.id),
        "quantity": 10,
        "delivery_country": "gh",
        "closes_at": (timezone.now() + timedelta(days=5)).isoformat(),
        "publish": True,
    }
    body.update(overrides)
    return body


def quote_payload(**overrides):
    body = {"unit_price": "20.00", "shipping_cost": "5.00", "lead_time_days": 7}
    body.update(overrides)
    return body


def fake_order_hook(rfq, quote):
    """Stand-in for ``orders.services.create_order_for_rfq`` (BE-ORD-1) using the current Order model."""
    from apps.orders.models import Order

    return Order.objects.create(
        user=rfq.buyer,
        total_amount=quote.total_price + quote.shipping_cost,
        subtotal=quote.total_price,
        shipping_cost=quote.shipping_cost,
        order_status="Pending",
        payment_status="unpaid",
        pay_mode="Online",
    )
