"""Fixtures shared by the seller-self endpoint tests (stats, balance, listings)."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, SubCategory
from apps.orders.models import Order, OrderItem
from apps.products.models import Product, ProductVariant
from apps.store.models import FeatureFlag

from .models import SellerProfile

User = get_user_model()
_counter = {"n": 0}


def next_n():
    _counter["n"] += 1
    return _counter["n"]


def set_sellers_flag(status="on"):
    FeatureFlag.objects.update_or_create(key="sellers", defaults={"name": "Sellers", "status": status})


def make_user(email, **extra):
    return User.objects.create_user(email=email, password="pass12345!", **extra)


def make_seller(email, status="verified", **extra):
    user = make_user(email)
    profile = SellerProfile.objects.create(
        user=user,
        business_name=extra.pop("business_name", f"Biz {email}"),
        verification_status=status,
        is_verified=status == "verified",
        id_type="ghana_card",
        id_number="GHA-123456789-0",
        **extra,
    )
    return user, profile


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def catalog():
    category, _ = Category.objects.get_or_create(name="Phones")
    sub, _ = SubCategory.objects.get_or_create(sub_category_name="Smart", category=category)
    brand, _ = Brand.objects.get_or_create(name="Acme", category=category)
    return category, sub, brand


def make_product(profile, name="Phone", status="Active", variants=(("10.00", 10),), default_index=None):
    """`variants` is a list of (price, quantity). Returns (product, [variants])."""
    category, sub, brand = catalog()
    n = next_n()
    product = Product.objects.create(
        name=f"{name} {n}",
        keywords=name,
        category=category,
        sub_category=sub,
        brand=brand,
        seller_profile=profile,
        status=status,
    )
    rows = [
        ProductVariant.objects.create(
            product=product, sku=f"SKU-{n}-{i}", price=Decimal(price), quantity=qty, name=f"V{i}"
        )
        for i, (price, qty) in enumerate(variants)
    ]
    if default_index is not None:
        product.default_variant = rows[default_index]
        product.save(update_fields=["default_variant"])
    return product, rows


def make_order(buyer, lines, status="Processing", placed_at=None, **extra):
    """`lines` is a list of (variant, quantity). total_price = unit price * quantity."""
    total = sum((v.price * q for v, q in lines), Decimal("0"))
    order = Order.objects.create(
        user=buyer, total_amount=total, order_status=status, pay_mode="Online", **extra
    )
    if placed_at is not None:
        Order.objects.filter(pk=order.pk).update(placed_at=placed_at)
    for variant, qty in lines:
        OrderItem.objects.create(
            order=order,
            product=variant.product,
            variant=variant,
            quantity=qty,
            unit_price=variant.price,
            total_price=variant.price * qty,
        )
    return order
