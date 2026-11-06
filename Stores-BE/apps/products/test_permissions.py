from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, SubCategory
from apps.sellers.models import SellerProfile

from .models import Inventory, Product, ProductVariant

User = get_user_model()
BASE = "/tradehut/api/v1/products/"


class ProductWritePermissionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = Category.objects.create(name="Phones")
        cls.sub = SubCategory.objects.create(sub_category_name="Smart", category=cls.category)
        cls.brand = Brand.objects.create(name="Acme", category=cls.category)

        def seller(email, status="verified", **extra):
            user = User.objects.create_user(email=email, password="x")
            profile = SellerProfile.objects.create(
                user=user, business_name=f"Shop {email}", verification_status=status,
                is_verified=status == "verified", **extra,
            )
            return user, profile

        cls.a_user, cls.a_profile = seller("a@s.test")
        cls.b_user, cls.b_profile = seller("b@s.test")
        cls.pending_user, cls.pending_profile = seller("p@s.test", "pending")
        cls.rejected_user, _ = seller("r@s.test", "rejected")
        cls.suspended_user, _ = seller("s@s.test", "suspended")
        cls.inactive_user, _ = seller("i@s.test", "verified", is_active=False)
        cls.buyer = User.objects.create_user(email="buyer@t.test", password="x")
        cls.staff = User.objects.create_user(email="staff@t.test", password="x", is_staff=True)

        cls.a_product = cls.make_product("A product", cls.a_profile)
        cls.b_product = cls.make_product("B product", cls.b_profile)
        cls.a_variant = ProductVariant.objects.create(
            product=cls.a_product, sku="A-1", price=Decimal("5.00"), quantity=3
        )
        cls.b_variant = ProductVariant.objects.create(
            product=cls.b_product, sku="B-1", price=Decimal("6.00"), quantity=3
        )
        cls.b_inventory = Inventory.objects.create(
            product=cls.b_product, quantity_in_stock=1, restock_date=timezone.now()
        )

    @classmethod
    def make_product(cls, name, profile):
        return Product.objects.create(
            name=name, keywords=name, category=cls.category, sub_category=cls.sub,
            brand=cls.brand, seller_profile=profile, status="Active",
        )

    def api(self, user=None):
        c = APIClient()
        if user:
            c.force_authenticate(user)
        return c

    def payload(self, **extra):
        return {
            "name": "New thing", "keywords": "new", "status": "Active",
            "category": str(self.category.pk), "sub_category": str(self.sub.pk),
            "brand": str(self.brand.pk), **extra,
        }

    # ---- products -------------------------------------------------------------
    def test_reads_stay_public(self):
        c = self.api()
        self.assertEqual(c.get(BASE).status_code, 200)
        self.assertEqual(c.get(f"{BASE}catalog/").status_code, 200)
        self.assertEqual(c.get(f"{BASE}{self.a_product.pk}/").status_code, 200)

    def test_anonymous_cannot_write_products(self):
        c = self.api()
        before = Product.objects.count()
        self.assertIn(c.post(BASE, self.payload(), format="json").status_code, (401, 403))
        self.assertIn(c.patch(f"{BASE}{self.a_product.pk}/", {"name": "x"}, format="json").status_code, (401, 403))
        self.assertIn(c.put(f"{BASE}{self.a_product.pk}/", self.payload(), format="json").status_code, (401, 403))
        self.assertIn(c.delete(f"{BASE}{self.a_product.pk}/").status_code, (401, 403))
        self.assertEqual(Product.objects.count(), before)
        self.a_product.refresh_from_db()
        self.assertEqual(self.a_product.name, "A product")

    def test_buyer_and_non_writing_sellers_cannot_create(self):
        for user in (self.buyer, self.rejected_user, self.suspended_user, self.inactive_user):
            res = self.api(user).post(BASE, self.payload(), format="json")
            self.assertEqual(res.status_code, 403, user.email)

    def test_seller_create_forces_own_seller_profile(self):
        res = self.api(self.a_user).post(
            BASE, self.payload(seller_profile=str(self.b_profile.pk), seller=str(self.b_user.pk)), format="json"
        )
        self.assertEqual(res.status_code, 201, res.content)
        product = Product.objects.get(pk=res.json()["id"])
        self.assertEqual(product.seller_profile_id, self.a_profile.pk)
        self.assertEqual(product.seller_id, self.a_user.pk)

    def test_pending_seller_can_create(self):
        res = self.api(self.pending_user).post(BASE, self.payload(), format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Product.objects.get(pk=res.json()["id"]).seller_profile_id, self.pending_profile.pk)

    def test_staff_can_create_for_any_seller(self):
        res = self.api(self.staff).post(
            BASE, self.payload(seller_profile=str(self.b_profile.pk)), format="json"
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Product.objects.get(pk=res.json()["id"]).seller_profile_id, self.b_profile.pk)

    def test_owner_can_update_and_delete(self):
        c = self.api(self.a_user)
        res = c.patch(f"{BASE}{self.a_product.pk}/", {"name": "Renamed"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.a_product.refresh_from_db()
        self.assertEqual(self.a_product.name, "Renamed")
        # The delete cascade touches orders.OrderItem.variant, whose migration is still
        # pending (uncommitted orders WIP), so only the permission path is exercised.
        with mock.patch.object(Product, "delete", autospec=True) as delete:
            self.assertEqual(c.delete(f"{BASE}{self.a_product.pk}/").status_code, 204)
        delete.assert_called_once()

    def test_other_seller_cannot_modify(self):
        c = self.api(self.b_user)
        self.assertEqual(c.patch(f"{BASE}{self.a_product.pk}/", {"name": "hijack"}, format="json").status_code, 403)
        self.assertEqual(c.delete(f"{BASE}{self.a_product.pk}/").status_code, 403)
        self.a_product.refresh_from_db()
        self.assertEqual(self.a_product.name, "A product")

    def test_seller_cannot_reassign_seller_profile(self):
        res = self.api(self.a_user).patch(
            f"{BASE}{self.a_product.pk}/",
            {"seller_profile": str(self.b_profile.pk), "seller": str(self.b_user.pk)},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.a_product.refresh_from_db()
        self.assertEqual(self.a_product.seller_profile_id, self.a_profile.pk)
        self.assertEqual(self.a_product.seller_id, None)  # unchanged: was never set

    def test_seller_cannot_point_default_variant_at_foreign_variant(self):
        res = self.api(self.a_user).patch(
            f"{BASE}{self.a_product.pk}/", {"default_variant": str(self.b_variant.pk)}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        ok = self.api(self.a_user).patch(
            f"{BASE}{self.a_product.pk}/", {"default_variant": str(self.a_variant.pk)}, format="json"
        )
        self.assertEqual(ok.status_code, 200, ok.content)

    def test_staff_can_update_delete_and_reassign(self):
        c = self.api(self.staff)
        res = c.patch(f"{BASE}{self.a_product.pk}/", {"seller_profile": str(self.b_profile.pk)}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.a_product.refresh_from_db()
        self.assertEqual(self.a_product.seller_profile_id, self.b_profile.pk)
        with mock.patch.object(Product, "delete", autospec=True) as delete:
            self.assertEqual(c.delete(f"{BASE}{self.a_product.pk}/").status_code, 204)
        delete.assert_called_once()

    def test_wishlist_action_still_needs_login_only(self):
        self.assertIn(self.api().post(f"{BASE}{self.a_product.pk}/add_to_wishlist/").status_code, (401, 403))
        self.assertEqual(self.api(self.buyer).post(f"{BASE}{self.a_product.pk}/add_to_wishlist/").status_code, 200)

    # ---- children --------------------------------------------------------------
    def child_payloads(self, product, variant):
        now = timezone.now()
        return {
            "variants/": {"product": str(product.pk), "sku": f"NEW-{product.pk.hex[:6]}", "price": "9.00", "quantity": 2},
            "images/": {"product": str(product.pk), "product_variant": str(variant.pk)},
            "inventory/": {"product": str(product.pk), "quantity_in_stock": 4, "restock_date": now.isoformat()},
            "discounts/": {
                "product": str(product.pk), "new_price": "4.00",
                "discount_start": now.isoformat(), "discount_end": (now + timedelta(days=1)).isoformat(),
            },
            "key-features/": {"product": str(product.pk), "name": "Waterproof"},
        }

    def test_anonymous_and_buyer_cannot_write_children(self):
        for user in (None, self.buyer):
            c = self.api(user)
            for path, body in self.child_payloads(self.a_product, self.a_variant).items():
                res = c.post(f"{BASE}{path}", body, format="json")
                self.assertIn(res.status_code, (401, 403), (path, user))
        self.assertEqual(ProductVariant.objects.filter(product=self.a_product).count(), 1)

    def test_owner_can_create_children_on_own_product(self):
        c = self.api(self.a_user)
        for path, body in self.child_payloads(self.a_product, self.a_variant).items():
            res = c.post(f"{BASE}{path}", body, format="json")
            self.assertEqual(res.status_code, 201, (path, res.content))

    def test_seller_cannot_create_children_on_foreign_product(self):
        c = self.api(self.a_user)
        for path, body in self.child_payloads(self.b_product, self.b_variant).items():
            res = c.post(f"{BASE}{path}", body, format="json")
            self.assertEqual(res.status_code, 403, (path, res.content))
        self.assertEqual(ProductVariant.objects.filter(product=self.b_product).count(), 1)

    def test_image_variant_must_belong_to_the_same_product(self):
        res = self.api(self.a_user).post(
            f"{BASE}images/",
            {"product": str(self.a_product.pk), "product_variant": str(self.b_variant.pk)},
            format="json",
        )
        self.assertEqual(res.status_code, 400, res.content)

    def test_seller_cannot_update_or_delete_foreign_children(self):
        c = self.api(self.a_user)
        self.assertEqual(c.patch(f"{BASE}variants/{self.b_variant.pk}/", {"quantity": 99}, format="json").status_code, 403)
        self.assertEqual(c.delete(f"{BASE}variants/{self.b_variant.pk}/").status_code, 403)
        self.assertEqual(c.patch(f"{BASE}inventory/{self.b_inventory.pk}/", {"quantity_in_stock": 99}, format="json").status_code, 403)
        self.b_variant.refresh_from_db()
        self.assertEqual(self.b_variant.quantity, 3)

    def test_seller_cannot_move_own_child_to_foreign_product(self):
        res = self.api(self.a_user).patch(
            f"{BASE}variants/{self.a_variant.pk}/", {"product": str(self.b_product.pk)}, format="json"
        )
        self.assertEqual(res.status_code, 403)
        self.a_variant.refresh_from_db()
        self.assertEqual(self.a_variant.product_id, self.a_product.pk)

    def test_owner_can_update_and_delete_own_child(self):
        c = self.api(self.a_user)
        self.assertEqual(c.patch(f"{BASE}variants/{self.a_variant.pk}/", {"quantity": 7}, format="json").status_code, 200)
        self.a_variant.refresh_from_db()
        self.assertEqual(self.a_variant.quantity, 7)
        with mock.patch.object(ProductVariant, "delete", autospec=True) as delete:
            self.assertEqual(c.delete(f"{BASE}variants/{self.a_variant.pk}/").status_code, 204)
        delete.assert_called_once()

    def test_staff_can_write_any_child(self):
        c = self.api(self.staff)
        for path, body in self.child_payloads(self.b_product, self.b_variant).items():
            self.assertEqual(c.post(f"{BASE}{path}", body, format="json").status_code, 201, path)
        self.assertEqual(c.patch(f"{BASE}variants/{self.b_variant.pk}/", {"quantity": 1}, format="json").status_code, 200)
