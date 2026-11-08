"""SE4 GET sellers/me/stats/."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.auctions.models import Auction
from apps.auctions.tests.helpers import make_auction
from apps.store.models import FeatureFlag

from .models import SellerProfile
from .seller_test_helpers import (
    client_for,
    make_order,
    make_product,
    make_seller,
    make_user,
    set_sellers_flag,
)

URL = "/tradehut/api/v1/sellers/me/stats/"
User = get_user_model()


class SellerStatsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        set_sellers_flag("on")
        cls.user_a, cls.a = make_seller("a@th.test")
        cls.user_b, cls.b = make_seller("b@th.test")
        cls.buyer = make_user("buyer@th.test")
        now = timezone.now()

        cls.p1, (cls.p1v0, cls.p1v1) = make_product(cls.a, "P1", "Active", [("100.00", 3), ("50.00", 20)])
        make_product(cls.a, "P2", "Archived", [("10.00", 1)])  # low but archived: not counted
        make_product(cls.a, "P3", "Draft", [("10.00", 2)])  # low, draft: counted low, not active
        cls.p4, (cls.p4v,) = make_product(cls.a, "P4", "Active", [("40.00", 6)])  # not low
        _, (cls.bv,) = make_product(cls.b, "B1", "Active", [("20.00", 1)])

        make_order(cls.buyer, [(cls.p1v0, 2), (cls.p1v1, 1)], "Processing", now)  # 250.00
        make_order(cls.buyer, [(cls.p4v, 1)], "Shipped", now - timedelta(days=3))  # 40.00
        make_order(cls.buyer, [(cls.p4v, 1)], "Pending", now)  # not a sale, not to ship
        make_order(cls.buyer, [(cls.p4v, 1)], "Cancelled", now)
        make_order(cls.buyer, [(cls.p4v, 1)], "Delivered", now - timedelta(days=45))  # outside window
        make_order(cls.buyer, [(cls.p1v1, 1)], "Processing", now - timedelta(days=40))  # to ship, old
        # Shared legacy order: only A's 2 x 50.00 counts for A, only B's 5 x 20.00 for B.
        make_order(cls.buyer, [(cls.p1v1, 2), (cls.bv, 5)], "Processing", now - timedelta(days=2))

        make_auction(cls.a)  # live
        ended = now - timedelta(hours=1)
        make_auction(cls.a, status=Auction.STATUS_ENDED, ends_at=ended, original_ends_at=ended)
        make_auction(cls.b)

    def get(self, user):
        return client_for(user).get(URL)

    def test_numbers_for_seller_a(self):
        res = self.get(self.user_a)
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["sales_30d"], "390.00")
        self.assertEqual(body["orders_30d"], 3)
        self.assertEqual(body["orders_to_ship"], 3)
        self.assertEqual(body["low_stock_variants"], 2)
        self.assertEqual(body["active_listings"], 2)
        self.assertEqual(body["live_auctions"], 1)
        self.assertEqual(body["open_rfq_matches"], 0)
        self.assertEqual(body["currency"], "GHS")

    def test_sales_by_day_series(self):
        series = self.get(self.user_a).json()["sales_by_day"]
        self.assertEqual(len(series), 30)
        today = timezone.localdate()
        self.assertEqual(series[-1]["date"], today.isoformat())
        self.assertEqual(series[0]["date"], (today - timedelta(days=29)).isoformat())
        self.assertEqual(series[-1]["total"], "250.00")
        self.assertEqual(sum(Decimal(d["total"]) for d in series), Decimal("390.00"))

    def test_other_seller_data_never_appears(self):
        body = self.get(self.user_b).json()
        self.assertEqual(body["sales_30d"], "100.00")  # B's own 5 x 20.00 only
        self.assertEqual(body["orders_30d"], 1)
        self.assertEqual(body["orders_to_ship"], 1)
        self.assertEqual(body["low_stock_variants"], 1)
        self.assertEqual(body["active_listings"], 1)
        self.assertEqual(body["live_auctions"], 1)

    def test_seller_without_activity_gets_zeros(self):
        user, _ = make_seller("quiet@th.test")
        body = self.get(user).json()
        self.assertEqual(body["sales_30d"], "0.00")
        for key in ("orders_30d", "orders_to_ship", "low_stock_variants", "active_listings", "live_auctions"):
            self.assertEqual(body[key], 0, key)

    def test_unauthenticated_is_401(self):
        self.assertEqual(client_for().get(URL).status_code, 401)

    def test_buyer_without_profile_is_denied(self):
        res = self.get(self.buyer)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["code"], "not_a_seller")
        self.assertFalse(SellerProfile.objects.filter(user=self.buyer).exists())

    def test_flag_beta_blocks_regular_seller_until_added_as_beta_user(self):
        set_sellers_flag("beta")
        res = self.get(self.user_a)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "feature_disabled")
        FeatureFlag.objects.get(key="sellers").beta_users.add(self.user_a)
        self.assertEqual(self.get(self.user_a).status_code, 200)

    def test_owner_superuser_without_profile_gets_200(self):
        set_sellers_flag("off")
        owner = User.objects.create_superuser(email="owner@th.test", password="pass12345!")
        res = self.get(owner)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["sales_30d"], "0.00")
        self.assertEqual(SellerProfile.objects.filter(user=owner).count(), 1)

    def test_query_count_does_not_grow_with_data(self):
        client = client_for(self.user_a)
        client.get(URL)
        with CaptureQueriesContext(connection) as before:
            client.get(URL)
        for i in range(5):
            _, (variant,) = make_product(self.a, f"Extra{i}", "Active", [("5.00", 1)])
            make_order(self.buyer, [(variant, 1)], "Processing", timezone.now())
        with CaptureQueriesContext(connection) as after:
            client.get(URL)
        self.assertEqual(len(before), len(after))
        self.assertLessEqual(len(after), 12)
