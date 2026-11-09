"""GET products/seller/ - the requesting seller's own listings."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.sellers.models import SellerProfile
from apps.sellers.seller_test_helpers import (
    client_for,
    make_product,
    make_seller,
    make_user,
    set_sellers_flag,
)

from .models import Product

URL = "/tradehut/api/v1/products/seller/"
User = get_user_model()


def names(res):
    return [row["name"] for row in res.json()["results"]]


@override_settings(SEARCH_ENABLE_ES=False, SEARCH_ENABLE_EMBEDDINGS=False)
class SellerListingsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        set_sellers_flag("on")
        cls.user_a, cls.a = make_seller("a@th.test")
        cls.user_b, cls.b = make_seller("b@th.test")
        now = timezone.now()

        cls.apple, _ = make_product(cls.a, "Apple", "Active", [("30.00", 10), ("20.00", 2)])
        cls.banana, _ = make_product(cls.a, "Banana", "Draft", [("10.00", 50)])
        cls.cherry, _ = make_product(cls.a, "Cherry", "Archived", [("5.00", 1)])
        cls.deleted, _ = make_product(cls.a, "Gone", "Deleted", [("5.00", 1)])
        cls.date, (cls.date_v0, cls.date_v1) = make_product(
            cls.a, "Date", "Active", [("100.00", 9), ("15.00", 9)], default_index=0
        )
        cls.theirs, _ = make_product(cls.b, "Theirs", "Active", [("1.00", 1)])

        for product, age in ((cls.apple, 1), (cls.banana, 2), (cls.cherry, 3), (cls.date, 4), (cls.theirs, 0)):
            Product.objects.filter(pk=product.pk).update(updated_at=now - timedelta(days=age))

    def get(self, user=None, **params):
        return client_for(user or self.user_a).get(URL, params)

    def test_sees_only_own_non_deleted_products(self):
        res = self.get()
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["count"], 4)
        self.assertNotIn(self.theirs.name, names(res))
        self.assertNotIn(self.deleted.name, names(res))
        self.assertEqual(self.get(self.user_b).json()["count"], 1)
        self.assertEqual(names(self.get(self.user_b)), [self.theirs.name])

    def test_row_shape(self):
        row = next(r for r in self.get().json()["results"] if r["id"] == str(self.apple.pk))
        self.assertEqual(
            set(row),
            {
                "id", "name", "status", "main_product_image", "category_name", "pricing_currency",
                "primary_sku", "primary_variant_price", "variant_stock_total", "free_shipping",
                "updated_at", "variants",
            },
        )
        self.assertEqual(row["status"], "Active")
        self.assertEqual(row["category_name"], "Phones")
        self.assertEqual(row["pricing_currency"], "GHS")
        self.assertEqual(row["variant_stock_total"], 12)
        self.assertFalse(row["free_shipping"])
        self.assertIsNone(row["main_product_image"])
        self.assertEqual([set(v) for v in row["variants"]], [{"id", "sku", "price", "quantity", "name"}] * 2)
        # No default variant set: primary is the cheapest, and variants are listed cheapest first.
        self.assertEqual(row["primary_variant_price"], "20.00")
        self.assertEqual([v["price"] for v in row["variants"]], ["20.00", "30.00"])
        self.assertEqual(row["primary_sku"], row["variants"][0]["sku"])

    def test_primary_variant_is_the_default_variant(self):
        row = next(r for r in self.get().json()["results"] if r["id"] == str(self.date.pk))
        self.assertEqual(row["primary_variant_price"], "100.00")
        self.assertEqual(row["primary_sku"], self.date_v0.sku)

    def test_status_filter(self):
        self.assertEqual(names(self.get(status="Draft")), [self.banana.name])
        self.assertEqual(names(self.get(status="Archived")), [self.cherry.name])
        self.assertEqual(self.get(status="Active").json()["count"], 2)
        self.assertEqual(self.get(status="Deleted").json()["count"], 1)

    def test_unknown_status_and_ordering_are_400(self):
        self.assertEqual(self.get(status="Bogus").status_code, 400)
        self.assertEqual(self.get(ordering="secret").status_code, 400)

    def test_search_matches_name_and_sku_without_duplicates(self):
        self.assertEqual(names(self.get(q="apple")), [self.apple.name])
        sku = self.apple.variants.first().sku
        res = self.get(q=sku)
        self.assertEqual(names(res), [self.apple.name])
        both = self.get(q="SKU-")  # every variant matches; each product listed once
        self.assertEqual(both.json()["count"], 4)
        self.assertEqual(self.get(q="nothing-like-this").json()["count"], 0)
        self.assertEqual(self.get(q=self.theirs.name).json()["count"], 0)

    def test_low_stock_filter(self):
        # Apple has a variant with 2; Cherry has 1 but is archived, so it is left out.
        self.assertEqual(names(self.get(low_stock="true")), [self.apple.name])
        # An explicit status brings archived rows back.
        self.assertEqual(names(self.get(low_stock="true", status="Archived")), [self.cherry.name])

    def test_ordering(self):
        self.assertEqual(names(self.get()), [f for f in (
            self.apple.name, self.banana.name, self.cherry.name, self.date.name)])  # -updated_at default
        self.assertEqual(names(self.get(ordering="updated_at"))[0], self.date.name)
        self.assertEqual(names(self.get(ordering="name")), sorted([
            self.apple.name, self.banana.name, self.cherry.name, self.date.name]))
        self.assertEqual(names(self.get(ordering="-name"))[0], self.date.name)
        # price uses the primary variant: Cherry 5, Banana 10, Apple 20 (cheapest), Date 100 (default)
        self.assertEqual(
            names(self.get(ordering="price")),
            [self.cherry.name, self.banana.name, self.apple.name, self.date.name],
        )
        self.assertEqual(names(self.get(ordering="-price"))[0], self.date.name)

    def test_pagination(self):
        first = self.get(page_size=3, ordering="name").json()
        self.assertEqual(first["count"], 4)
        self.assertEqual(len(first["results"]), 3)
        self.assertIsNotNone(first["next"])
        second = self.get(page_size=3, page=2, ordering="name").json()
        self.assertEqual(len(second["results"]), 1)
        self.assertIsNone(second["next"])
        self.assertEqual(
            [r["name"] for r in first["results"] + second["results"]],
            sorted([self.apple.name, self.banana.name, self.cherry.name, self.date.name]),
        )

    def test_no_n_plus_one(self):
        client = client_for(self.user_a)
        client.get(URL)
        with CaptureQueriesContext(connection) as before:
            client.get(URL)
        for i in range(6):
            make_product(self.a, f"More{i}", "Active", [("1.00", 1), ("2.00", 2)])
        with CaptureQueriesContext(connection) as after:
            client.get(URL, {"page_size": 100})
        self.assertEqual(len(before), len(after))

    def test_seller_is_not_parsed_as_a_product_id(self):
        self.assertEqual(client_for().get(URL).status_code, 401)
        # The detail route still works for real ids.
        res = client_for().get(f"{URL.rsplit('seller/', 1)[0]}{self.apple.pk}/")
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_is_401(self):
        self.assertEqual(client_for().get(URL).status_code, 401)

    def test_buyer_without_profile_is_denied(self):
        res = client_for(make_user("buyer@th.test")).get(URL)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["code"], "not_a_seller")

    def test_flag_beta_blocks_regular_seller(self):
        set_sellers_flag("beta")
        res = self.get()
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "feature_disabled")

    def test_owner_superuser_without_profile_gets_200_and_own_empty_list(self):
        set_sellers_flag("off")
        owner = User.objects.create_superuser(email="owner@th.test", password="pass12345!")
        res = client_for(owner).get(URL)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["count"], 0)
        self.assertTrue(SellerProfile.objects.filter(user=owner).exists())
