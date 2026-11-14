"""Shared fixtures for the sponsored products tests (no tests in this module)."""

import hashlib
import hmac
import itertools
import json
from decimal import Decimal
from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.ads import sponsored_services as services
from apps.ads.sponsored_models import SponsoredPackage, SponsoredPromotion
from apps.auctions.tests.helpers import make_seller, make_user
from apps.catalog.models import Brand, Category, SubCategory
from apps.products.models import Product, ProductVariant

BASE = "/tradehut/api/v1/ads/sponsored/"
WEBHOOK = "/tradehut/api/v1/payments/paystack/webhook/"
SECRET = "sk_test_sponsored"
INIT_OK = {"authorization_url": "https://checkout.paystack.com/spn123", "access_code": "ac_1", "reference": "x"}

paystack_on = override_settings(PAYSTACK_SECRET_KEY=SECRET, SELLER_CENTRAL_URL="http://localhost:3001")

_seq = itertools.count(1)


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def make_category(name=None):
    n = next(_seq)
    category = Category.objects.create(name=name or f"Category {n}")
    sub = SubCategory.objects.create(sub_category_name=f"Sub {n}", category=category)
    brand = Brand.objects.create(name=f"Brand {n}", category=category)
    return category, sub, brand


def make_product(seller, *, name=None, catalog=None, quantity=10, status="Active", available=True):
    n = next(_seq)
    category, sub, brand = catalog or make_category()
    product = Product.objects.create(
        name=name or f"Product {n}",
        keywords="k",
        category=category,
        sub_category=sub,
        brand=brand,
        seller=seller.user,
        seller_profile=seller,
        status=status,
        available=available,
    )
    ProductVariant.objects.create(product=product, sku=f"SPN-{n}", price=Decimal("20.00"), quantity=quantity)
    return product


def make_package(*, price="50.00", surfaces=("search", "category"), days=7, max_concurrent=None, **extra):
    return SponsoredPackage.objects.create(
        name=extra.pop("name", f"Boost {next(_seq)}"),
        surfaces=list(surfaces),
        duration_days=days,
        price=Decimal(price),
        max_concurrent=max_concurrent,
        **extra,
    )


def sign(body: str, secret: str = SECRET) -> str:
    return hmac.new(secret.encode(), body.encode(), hashlib.sha512).hexdigest()


def charge_event(promotion, *, amount=None, currency=None, name="charge.success"):
    minor = int(promotion.price_paid * 100) if amount is None else amount
    return {
        "event": name,
        "data": {
            "id": 555001,
            "status": "success",
            "reference": promotion.reference,
            "amount": minor,
            "currency": currency or promotion.currency,
            "channel": "card",
            "gateway_response": "Successful",
            "paid_at": "2026-11-13T10:00:00.000Z",
            "authorization": {"card_type": "visa", "last4": "4081", "signature": "SECRET-CARD-DATA"},
            "customer": {"email": "buyer@test.invalid"},
        },
    }


def post_webhook(event, *, signature="valid"):
    body = json.dumps(event)
    headers = {"HTTP_X_PAYSTACK_SIGNATURE": sign(body)} if signature == "valid" else {}
    return APIClient().post(WEBHOOK, body, content_type="application/json", **headers)


@paystack_on
class SponsoredBase(TestCase):
    def setUp(self):
        self.seller = make_seller("seller", status="verified")
        self.other_seller = make_seller("rival", status="verified")
        self.staff = make_user("staff", is_staff=True)
        self.product = make_product(self.seller)
        self.package = make_package()
        self._n = 0

    def key(self):
        self._n += 1
        return f"key-{self._n}"

    def buy(self, *, product=None, package=None, user=None, key=None, init=INIT_OK, **extra):
        body = {"product_id": str((product or self.product).pk), "package_id": str((package or self.package).pk), **extra}
        side = {"side_effect": init} if isinstance(init, Exception) else {"return_value": init}
        with mock.patch("apps.payments.paystack.initialize", **side) as initialize:
            res = client_for(user or self.seller.user).post(
                BASE + "seller/", body, format="json", HTTP_IDEMPOTENCY_KEY=key or self.key()
            )
        self.initialize = initialize
        return res

    def promotion_from(self, res):
        return SponsoredPromotion.objects.get(pk=res.json()["promotion"]["id"])

    def pay(self, promotion):
        """Deliver the signed charge.success webhook and run the commit hooks."""
        with self.captureOnCommitCallbacks(execute=True):
            res = post_webhook(charge_event(promotion))
        self.assertEqual(res.status_code, 200, res.content)
        promotion.refresh_from_db()
        return promotion

    def paid_promotion(self, **kwargs):
        res = self.buy(**kwargs)
        self.assertEqual(res.status_code, 201, res.content)
        return self.pay(self.promotion_from(res))

    def approved_promotion(self, now=None, **kwargs):
        promotion = self.paid_promotion(**kwargs)
        with self.captureOnCommitCallbacks(execute=True):
            services.approve(promotion.pk, staff=self.staff, now=now)
        promotion.refresh_from_db()
        return promotion

    def staff_post(self, promotion, action, body=None):
        with self.captureOnCommitCallbacks(execute=True):
            return client_for(self.staff).post(BASE + f"staff/{promotion.pk}/{action}/", body or {}, format="json")
