from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, SubCategory
from apps.sellers.models import SellerProfile

from apps.merchandising.models import HomepageSection, HomepageSectionItem, PopulationRule
from apps.merchandising.services import resolve_section_products

from .models import Inventory, Product, ProductDiscount, ProductImage, ProductVariant

User = get_user_model()
BASE = "/tradehut/api/v1/products/"


class PublicProductVisibilityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        category = Category.objects.create(name="Phones")
        sub = SubCategory.objects.create(sub_category_name="Smart", category=category)
        brand = Brand.objects.create(name="Acme", category=category)

        def seller(email, status, **extra):
            user = User.objects.create_user(email=email, password="pass12345!")
            profile = SellerProfile.objects.create(
                user=user, business_name=f"Shop {email}", verification_status=status,
                is_verified=status == "verified", **extra,
            )
            return user, profile

        def product(name, profile=None):
            return Product.objects.create(
                name=name, keywords=name, category=category, sub_category=sub, brand=brand,
                seller_profile=profile, status="Active",
            )

        cls.verified_user, verified = seller("v@s.test", "verified")
        cls.pending_user, pending = seller("p@s.test", "pending")
        _, suspended = seller("s@s.test", "suspended")
        _, inactive = seller("i@s.test", "verified", is_active=False)
        cls.staff = User.objects.create_user(email="staff@t.test", password="x", is_staff=True)
        cls.other = User.objects.create_user(email="other@t.test", password="x")

        cls.visible = product("Visible", verified)
        cls.platform = product("Platform listing")
        cls.hidden_pending = product("Hidden pending", pending)
        cls.hidden_suspended = product("Hidden suspended", suspended)
        cls.hidden_inactive = product("Hidden inactive", inactive)

        def children(prod, sku):
            variant = ProductVariant.objects.create(
                product=prod, sku=sku, price=Decimal("10.00"), quantity=5
            )
            image = ProductImage.objects.create(product=prod, product_variant=variant, image=None)
            stock = Inventory.objects.create(
                product=prod, quantity_in_stock=5, restock_date=timezone.now()
            )
            now = timezone.now()
            discount = ProductDiscount.objects.create(
                product=prod,
                new_price=Decimal("8.00"),
                discount_start=now,
                discount_end=now + timedelta(days=1),
            )
            return variant, image, stock, discount

        cls.visible_children = children(cls.visible, "SKU-VIS")
        cls.hidden_children = children(cls.hidden_pending, "SKU-HID")

    def names(self, client, path="catalog/"):
        res = client.get(BASE + path)
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        rows = data["results"] if isinstance(data, dict) else data
        return {r["name"] for r in rows}

    def client_for(self, user=None):
        client = APIClient()
        if user:
            client.force_authenticate(user)
        return client

    def test_anonymous_catalog_and_list_hide_unverified(self):
        for path in ("catalog/", "", "search/", "new_arrivals/", "popular/"):
            self.assertEqual(self.names(self.client_for(), path), {"Visible", "Platform listing"}, path)

    def test_anonymous_retrieve_hidden_is_404(self):
        client = self.client_for()
        self.assertEqual(client.get(f"{BASE}{self.visible.pk}/").status_code, 200)
        for hidden in (self.hidden_pending, self.hidden_suspended, self.hidden_inactive):
            self.assertEqual(client.get(f"{BASE}{hidden.pk}/").status_code, 404)

    def test_non_owner_cannot_see_pending_products(self):
        self.assertNotIn("Hidden pending", self.names(self.client_for(self.other)))
        self.assertEqual(self.client_for(self.other).get(f"{BASE}{self.hidden_pending.pk}/").status_code, 404)

    def test_owner_sees_own_unverified_products_only(self):
        client = self.client_for(self.pending_user)
        self.assertEqual(self.names(client), {"Visible", "Platform listing", "Hidden pending"})
        self.assertEqual(client.get(f"{BASE}{self.hidden_pending.pk}/").status_code, 200)
        self.assertEqual(client.get(f"{BASE}{self.hidden_suspended.pk}/").status_code, 404)

    def test_staff_sees_everything(self):
        names = self.names(self.client_for(self.staff))
        self.assertEqual(
            names,
            {"Visible", "Platform listing", "Hidden pending", "Hidden suspended", "Hidden inactive"},
        )
        self.assertEqual(self.client_for(self.staff).get(f"{BASE}{self.hidden_suspended.pk}/").status_code, 200)

    def test_verifying_the_seller_publishes_products(self):
        SellerProfile.objects.filter(user=self.pending_user).update(
            verification_status="verified", is_verified=True
        )
        self.assertIn("Hidden pending", self.names(self.client_for()))

    # --- child viewsets -------------------------------------------------------
    CHILD_PATHS = ("variants/", "images/", "inventory/", "discounts/")

    def child_ids(self, client, path):
        res = client.get(BASE + path)
        self.assertEqual(res.status_code, 200, (path, res.content))
        data = res.json()
        rows = data["results"] if isinstance(data, dict) else data
        return {str(r["id"]) for r in rows}

    def test_children_of_hidden_products_are_not_public(self):
        for idx, path in enumerate(self.CHILD_PATHS):
            visible_id = str(self.visible_children[idx].pk)
            hidden_id = str(self.hidden_children[idx].pk)
            anon = self.child_ids(self.client_for(), path)
            self.assertIn(visible_id, anon, path)
            self.assertNotIn(hidden_id, anon, path)
            self.assertEqual(self.client_for().get(f"{BASE}{path}{hidden_id}/").status_code, 404, path)
            self.assertEqual(
                self.client_for(self.other).get(f"{BASE}{path}{hidden_id}/").status_code, 404, path
            )

    def test_children_visible_to_owner_and_staff(self):
        for idx, path in enumerate(self.CHILD_PATHS):
            hidden_id = str(self.hidden_children[idx].pk)
            for user in (self.pending_user, self.staff):
                client = self.client_for(user)
                self.assertIn(hidden_id, self.child_ids(client, path), (path, user))
                self.assertEqual(client.get(f"{BASE}{path}{hidden_id}/").status_code, 200, (path, user))

    def test_variants_action_of_hidden_product_is_404_for_public(self):
        url = f"{BASE}{self.hidden_pending.pk}/variants/"
        self.assertEqual(self.client_for().get(url).status_code, 404)
        self.assertEqual(self.client_for(self.pending_user).get(url).status_code, 200)

    # --- homepage sections ------------------------------------------------------
    def test_homepage_sections_hide_unverified_sellers(self):
        manual = HomepageSection.objects.create(title="Manual", slug="manual", strategy="manual")
        for pos, prod in enumerate((self.visible, self.hidden_pending, self.hidden_suspended, self.platform)):
            HomepageSectionItem.objects.create(section=manual, product=prod, position=pos)
        names = {p.name for p in resolve_section_products(manual)}
        self.assertEqual(names, {"Visible", "Platform listing"})

        auto = HomepageSection.objects.create(title="New", slug="new", strategy="auto")
        PopulationRule.objects.create(
            section=auto, rule_type="new_arrivals", only_in_stock=False, only_available=False
        )
        names = {p.name for p in resolve_section_products(auto, bypass_cache=True)}
        self.assertEqual(names, {"Visible", "Platform listing"})

    # --- search -------------------------------------------------------------------
    def test_search_and_autocomplete_hide_unverified_sellers(self):
        res = self.client_for().get("/tradehut/api/v1/search/", {"q": "Hidden"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["results"], [])
        res = self.client_for().get("/tradehut/api/v1/search/", {"q": "i"})
        names = {r["name"] for r in res.json()["results"]}
        self.assertEqual(names, {"Visible", "Platform listing"})
        res = self.client_for(self.pending_user).get("/tradehut/api/v1/search/", {"q": "Hidden"})
        self.assertEqual({r["name"] for r in res.json()["results"]}, {"Hidden pending"})

        res = self.client_for().get("/tradehut/api/v1/search/autocomplete/", {"q": "Hidden"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertNotIn("Hidden pending", str(res.json()))

    # --- ES indexing ----------------------------------------------------------------
    def test_index_task_deindexes_hidden_products_and_indexes_public_ones(self):
        from apps.search import tasks

        fake_doc = mock.MagicMock()
        with mock.patch.object(tasks, "HAS_ELASTICSEARCH", True), \
                self.settings(SEARCH_ENABLE_ES=True), \
                mock.patch("apps.search.documents.ProductDocument", fake_doc):
            tasks.index_product_task.run(self.hidden_pending.pk)
            fake_doc.get.assert_called_once_with(id=self.hidden_pending.pk)
            fake_doc.return_value.update.assert_not_called()

            fake_doc.reset_mock()
            tasks.index_product_task.run(self.visible.pk)
            fake_doc.return_value.update.assert_called_once()
            fake_doc.get.assert_not_called()

    def test_reindex_seller_products_task_queues_each_product(self):
        from apps.search import tasks

        with mock.patch.object(tasks, "HAS_ELASTICSEARCH", True), \
                self.settings(SEARCH_ENABLE_ES=True), \
                mock.patch.object(tasks.index_product_task, "delay") as delay:
            tasks.reindex_seller_products_task.run(self.hidden_pending.seller_profile_id)
        delay.assert_called_once_with(self.hidden_pending.pk)
