"""Test factories. Rows are created directly through the ORM so tests control time and state."""

import itertools
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.auctions.models import Auction
from apps.authentication.models import UserVerification
from apps.catalog.models import Brand, Category, SubCategory
from apps.products.models import Product, ProductVariant
from apps.sellers.models import SellerProfile

User = get_user_model()
_seq = itertools.count(1)


def make_user(label="buyer", *, verified=True, **extra):
    n = next(_seq)
    user = User.objects.create_user(
        email=f"{label}{n}@test.invalid",
        username=f"{label}{n}",
        password="pass-12345",
        first_name=extra.pop("first_name", label.capitalize()),
        last_name=extra.pop("last_name", "Tester"),
        **extra,
    )
    if verified:
        UserVerification.objects.create(user=user, email_verified=True)
    return user


def make_seller(label="seller", *, status="verified"):
    user = make_user(label, verified=True)
    profile = SellerProfile.objects.create(
        user=user,
        business_name=f"{label.capitalize()} Shop {next(_seq)}",
        verification_status=status,
        is_verified=status == "verified",
        store_slug=f"{label}-shop-{next(_seq)}",
    )
    return profile


def make_variant(seller, *, quantity=10, price="50.00"):
    n = next(_seq)
    category = Category.objects.create(name=f"Cat {n}")
    sub = SubCategory.objects.create(sub_category_name=f"Sub {n}", category=category)
    brand = Brand.objects.create(name=f"Brand {n}", category=category)
    product = Product.objects.create(
        name=f"Product {n}",
        keywords="k",
        category=category,
        sub_category=sub,
        brand=brand,
        seller=seller.user,
        seller_profile=seller,
        status="Active",
    )
    return ProductVariant.objects.create(
        product=product, sku=f"SKU-{n}", price=Decimal(price), quantity=quantity
    )


def make_auction(seller, variant=None, **overrides):
    """A live auction by default (started an hour ago, ends in three hours)."""
    now = timezone.now()
    variant = variant or make_variant(seller)
    fields = dict(
        seller=seller,
        variant=variant,
        title="Test lot",
        quantity=1,
        currency="GHS",
        starting_price=Decimal("100.00"),
        min_increment=Decimal("5.00"),
        starts_at=now - timedelta(hours=1),
        ends_at=now + timedelta(hours=3),
        soft_close_seconds=120,
        status=Auction.STATUS_LIVE,
        create_idempotency_key=f"k{next(_seq)}",
    )
    fields.update(overrides)
    fields.setdefault("original_ends_at", fields["ends_at"])
    return Auction.objects.create(**fields)


def create_payload(variant, **overrides):
    now = timezone.now()
    body = {
        "variant_id": str(variant.id),
        "title": "Lot title",
        "description": "Details",
        "quantity": 2,
        "starting_price": "100.00",
        "min_increment": "5.00",
        "ends_at": (now + timedelta(days=2)).isoformat(),
        "soft_close_seconds": 120,
    }
    body.update(overrides)
    return body


def orders_table_ready() -> bool:
    """True when the ``orders`` table matches the Order model.

    The Order model carries uncommitted WIP whose migration BE-ORD-1 owns; until it
    lands, tests that must save an Order row are skipped rather than faked.
    """
    from django.db import connection

    from apps.orders.models import Order

    with connection.cursor() as cursor:
        columns = {c.name for c in connection.introspection.get_table_description(cursor, Order._meta.db_table)}
    return all(f.column in columns for f in Order._meta.concrete_fields)


def make_order(user, amount="100.00"):
    from apps.orders.models import Order

    return Order.objects.create(
        user=user, total_amount=Decimal(amount), pay_mode="Online", order_status="Pending"
    )
