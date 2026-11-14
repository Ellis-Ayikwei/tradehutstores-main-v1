"""Public P15 (live sponsored cards per surface) and the derived "live" rule."""

from datetime import timedelta

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.ads.sponsored_models import SponsoredPromotion
from apps.products.models import Product, ProductVariant

from .test_sponsored_base import BASE, SponsoredBase, client_for, make_category, make_package, make_product


class PublicBase(SponsoredBase):
    def get(self, **params):
        res = client_for().get(BASE, params)
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()["results"]

    def ids(self, **params):
        return {card["id"] for card in self.get(**params)}

    def live(self, product, package=None, **fields):
        """A promotion that is live right now, created straight in the database."""
        package = package or self.package
        now = timezone.now()
        values = dict(
            seller=product.seller_profile,
            product=product,
            package=package,
            surfaces=list(package.surfaces),
            duration_days=package.duration_days,
            price_paid=package.price,
            currency="GHS",
            status="approved",
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(days=1),
            idempotency_key=f"k-{product.pk}-{package.pk}-{timezone.now().timestamp()}",
        )
        values.update(fields)
        return SponsoredPromotion.objects.create(**values)


class SurfaceMatchingTests(PublicBase):
    def test_search_matches_name_and_category_terms(self):
        catalog = make_category("Garden Tools")
        spade = make_product(self.seller, name="Steel Spade", catalog=catalog)
        self.live(spade)
        self.assertEqual(self.ids(surface="search", q="spade"), {str(spade.pk)})
        self.assertEqual(self.ids(surface="search", q="steel garden"), {str(spade.pk)})  # each term, name or category
        self.assertEqual(self.ids(surface="search", q="SPADE"), {str(spade.pk)})
        self.assertEqual(self.ids(surface="search", q="spade piano"), set())
        self.assertEqual(self.ids(surface="search", q=""), set())
        self.assertEqual(self.ids(surface="search"), set())

    def test_a_package_without_the_surface_is_never_returned_for_it(self):
        home_only = make_package(surfaces=("home",))
        product = make_product(self.seller, name="Blue Mug")
        self.live(product, home_only)
        self.assertEqual(self.ids(surface="search", q="mug"), set())
        self.assertEqual(self.ids(surface="home"), {str(product.pk)})

    def test_category_by_id_name_or_sub_category(self):
        catalog = make_category("Kitchen")
        product = make_product(self.seller, catalog=catalog)
        elsewhere = make_product(self.seller)
        self.live(product)
        self.live(elsewhere)
        category, sub, _ = catalog
        self.assertEqual(self.ids(surface="category", category=str(category.pk)), {str(product.pk)})
        self.assertEqual(self.ids(surface="category", category=str(sub.pk)), {str(product.pk)})
        self.assertEqual(self.ids(surface="category", category="kitchen"), {str(product.pk)})
        self.assertEqual(self.ids(surface="category", category=sub.sub_category_name.lower()), {str(product.pk)})
        self.assertEqual(self.ids(surface="category", category="nothing"), set())
        self.assertEqual(self.ids(surface="category"), set())

    def test_home_returns_everything_live_up_to_the_limit(self):
        package = make_package(surfaces=("home",))
        products = [make_product(self.seller) for _ in range(12)]
        for product in products:
            self.live(product, package)
        self.assertEqual(len(self.get(surface="home")), 10)
        self.assertEqual(len(self.get(surface="home", limit="3")), 3)
        self.assertEqual(len(self.get(surface="home", limit="12")), 12)
        self.assertEqual(len(self.get(surface="home", limit="99")), 12)

    def test_default_limit_is_two_for_search_and_category(self):
        catalog = make_category("Bulk")
        for _ in range(4):
            self.live(make_product(self.seller, name="Widget", catalog=catalog))
        self.assertEqual(len(self.get(surface="search", q="widget")), 2)
        self.assertEqual(len(self.get(surface="category", category="bulk")), 2)

    def test_product_surface_is_same_category_without_the_product_itself(self):
        package = make_package(surfaces=("product",))
        catalog = make_category("Audio")
        viewed = make_product(self.seller, catalog=catalog)
        neighbour = make_product(self.seller, catalog=catalog)
        stranger = make_product(self.seller)
        for product in (viewed, neighbour, stranger):
            self.live(product, package)
        self.assertEqual(self.ids(surface="product", product=str(viewed.pk)), {str(neighbour.pk)})
        self.assertEqual(self.ids(surface="product", product="not-a-uuid"), set())
        self.assertEqual(self.ids(surface="product", product="00000000-0000-0000-0000-000000000000"), set())
        self.assertEqual(self.ids(surface="product"), set())

    def test_card_is_the_search_card_plus_the_sponsored_id(self):
        product = make_product(self.seller, name="Card Item")
        promotion = self.live(product)
        card = self.get(surface="search", q="card item")[0]
        for field in ("id", "slug", "name", "image", "price", "final_price", "rating", "in_stock", "variants", "default_variant"):
            self.assertIn(field, card)
        self.assertEqual((card["id"], card["sponsored_id"], card["price"]), (str(product.pk), str(promotion.pk), 20.0))

    def test_one_card_per_product_even_with_two_live_promotions(self):
        product = make_product(self.seller, name="Twin")
        self.live(product, make_package(surfaces=("search",)))
        self.live(product, make_package(surfaces=("search", "home")))
        self.assertEqual(len(self.get(surface="search", q="twin")), 1)


class LiveRuleTests(PublicBase):
    def setUp(self):
        super().setUp()
        self.product = make_product(self.seller, name="Rule Item")
        self.promotion = self.live(self.product)

    def shown(self):
        return self.ids(surface="search", q="rule item") == {str(self.product.pk)}

    def test_baseline_is_live(self):
        self.assertTrue(self.shown())

    def test_inactive_product_is_hidden_and_the_seller_sees_paused(self):
        for status in ("Draft", "Archived", "Deactivated", "Suspended", "Deleted", "Pending"):
            with self.subTest(status=status):
                Product.objects.filter(pk=self.product.pk).update(status=status)
                self.assertFalse(self.shown())
                mine = client_for(self.seller.user).get(BASE + f"seller/{self.promotion.pk}/").json()
                self.assertEqual((mine["status"], mine["display_status"]), ("approved", "paused"))
        Product.objects.filter(pk=self.product.pk).update(status="Active")
        self.assertTrue(self.shown())

    def test_out_of_stock_and_unavailable_products_are_hidden(self):
        ProductVariant.objects.filter(product=self.product).update(quantity=0)
        self.assertFalse(self.shown())
        ProductVariant.objects.filter(product=self.product).update(quantity=3)
        self.assertTrue(self.shown())
        Product.objects.filter(pk=self.product.pk).update(available=False)
        self.assertFalse(self.shown())

    def test_suspended_or_inactive_seller_is_hidden(self):
        self.seller.verification_status = "suspended"
        self.seller.save()
        self.assertFalse(self.shown())
        self.seller.verification_status = "verified"
        self.seller.is_active = False
        self.seller.save()
        self.assertFalse(self.shown())

    def test_outside_the_window_is_hidden_and_labelled(self):
        now = timezone.now()
        mine = client_for(self.seller.user)
        SponsoredPromotion.objects.filter(pk=self.promotion.pk).update(starts_at=now + timedelta(hours=1), ends_at=now + timedelta(days=2))
        self.assertFalse(self.shown())
        self.assertEqual(mine.get(BASE + f"seller/{self.promotion.pk}/").json()["display_status"], "scheduled")
        SponsoredPromotion.objects.filter(pk=self.promotion.pk).update(starts_at=now - timedelta(days=3), ends_at=now - timedelta(seconds=1))
        self.assertFalse(self.shown())
        self.assertEqual(mine.get(BASE + f"seller/{self.promotion.pk}/").json()["display_status"], "ended")

    def test_the_window_is_half_open(self):
        now = timezone.now()
        SponsoredPromotion.objects.filter(pk=self.promotion.pk).update(starts_at=now - timedelta(days=1), ends_at=now + timedelta(milliseconds=1))
        self.assertTrue(self.shown())
        SponsoredPromotion.objects.filter(pk=self.promotion.pk).update(starts_at=now + timedelta(seconds=30), ends_at=now + timedelta(days=1))
        self.assertFalse(self.shown())

    def test_only_approved_promotions_are_shown(self):
        for status in ("awaiting_payment", "pending_review", "rejected", "cancelled", "stopped", "abandoned"):
            with self.subTest(status=status):
                SponsoredPromotion.objects.filter(pk=self.promotion.pk).update(status=status)
                self.assertFalse(self.shown())

    def test_a_seller_who_is_not_verified_is_hidden_from_the_public(self):
        self.seller.verification_status = "pending"
        self.seller.save()
        self.assertFalse(self.shown())

    def test_staff_filters_by_derived_status(self):
        staff = client_for(self.staff)
        self.assertEqual(staff.get(BASE + "staff/?status=live").json()["count"], 1)
        self.assertEqual(staff.get(BASE + "staff/?status=paused").json()["count"], 0)
        Product.objects.filter(pk=self.product.pk).update(status="Archived")
        self.assertEqual(staff.get(BASE + "staff/?status=live").json()["count"], 0)
        self.assertEqual(staff.get(BASE + "staff/?status=paused").json()["count"], 1)


class JunkInputTests(PublicBase):
    def test_junk_never_errors(self):
        self.live(make_product(self.seller, name="Junk Item"))
        cases = [
            {},
            {"surface": "nonsense"},
            {"surface": "search", "q": "x" * 5000},
            {"surface": "search", "q": "%00 \u0000 ' OR 1=1 --"},
            {"surface": "search", "q": "😀 éè", "limit": "abc"},
            {"surface": "category", "category": "x" * 5000},
            {"surface": "category", "category": "%"},
            {"surface": "product", "product": "{}"},
            {"surface": "home", "limit": "-5"},
            {"surface": "home", "limit": "1e9"},
            {"surface": "home", "limit": ""},
        ]
        for params in cases:
            with self.subTest(params=params):
                res = client_for().get(BASE, params)
                self.assertEqual(res.status_code, 200, res.content)
                self.assertIn("results", res.json())

    def test_a_bad_token_does_not_break_the_public_read(self):
        res = client_for().get(BASE, {"surface": "home"}, HTTP_AUTHORIZATION="Bearer not-a-real-token")
        self.assertEqual(res.status_code, 200)

    def test_the_read_is_get_only(self):
        self.assertEqual(client_for().post(BASE, {}, format="json").status_code, 405)


class QueryCountTests(PublicBase):
    def count(self):
        with CaptureQueriesContext(connection) as ctx:
            self.assertEqual(client_for().get(BASE, {"surface": "home", "limit": "12"}).status_code, 200)
        return len(ctx)

    def test_query_count_does_not_grow_with_the_number_of_promotions(self):
        package = make_package(surfaces=("home",))
        self.live(make_product(self.seller), package)
        few = self.count()
        for _ in range(8):
            self.live(make_product(self.seller), package)
        self.assertEqual(self.count(), few)
