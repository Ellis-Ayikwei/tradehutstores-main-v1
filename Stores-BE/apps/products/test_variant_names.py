from decimal import Decimal
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, SubCategory
from apps.sellers.models import SellerProfile

from .models import Product, ProductVariant
from .serializers import ProductVariantWriteSerializer
from .variant_names import (
    GENERIC_VARIANT_NAME_MESSAGE,
    GENERIC_VARIANT_NAMES,
    is_generic_variant_name,
)

User = get_user_model()
BASE = "/tradehut/api/v1/products/"

GENERIC_SPELLINGS = [
    "default", "Default", "DEFAULT", "  default  ", "Default Variant", "default   variant",
    "Default Title", "standard", "Standard.", "single", "N/A", "n/a", "NA", "none",
    "None", "untitled", "Untitled", "regular", "Base", "-", "--", "(default)", "- Default -",
]


class IsGenericVariantNameTests(SimpleTestCase):
    def test_every_constant_entry_is_generic(self):
        for name in GENERIC_VARIANT_NAMES:
            self.assertTrue(is_generic_variant_name(name), name)

    def test_generic_spellings(self):
        for name in GENERIC_SPELLINGS:
            self.assertTrue(is_generic_variant_name(name), name)

    def test_real_and_blank_names_are_not_generic(self):
        for name in ["Red / Large", "Black", "64GB", "Standard Edition", "", "   ", None]:
            self.assertFalse(is_generic_variant_name(name), repr(name))


class VariantFixtureMixin:
    @classmethod
    def setUpTestData(cls):
        cls.category = Category.objects.create(name="Phones")
        cls.sub = SubCategory.objects.create(sub_category_name="Smart", category=cls.category)
        cls.brand = Brand.objects.create(name="Acme", category=cls.category)
        cls.user = User.objects.create_user(email="a@s.test", password="x")
        cls.profile = SellerProfile.objects.create(
            user=cls.user, business_name="Shop A", verification_status="verified", is_verified=True
        )

    def make_product(self, name):
        return Product.objects.create(
            name=name, keywords=name, category=self.category, sub_category=self.sub,
            brand=self.brand, seller_profile=self.profile, status="Active",
        )

    def make_variant(self, product, sku, name):
        return ProductVariant.objects.create(
            product=product, sku=sku, price=Decimal("5.00"), quantity=3, name=name
        )


class VariantNameSerializerTests(VariantFixtureMixin, TestCase):
    def payload(self, **extra):
        product = getattr(self, "_product", None) or self.make_product("P")
        self._product = product
        return {"product": str(product.pk), "sku": f"SKU-{len(extra)}-{id(extra)}",
                "price": "9.00", "quantity": 2, **extra}

    def test_accepts_blank_none_and_missing_name(self):
        for i, extra in enumerate([{"name": ""}, {"name": None}, {}, {"name": "   "}]):
            data = self.payload(**extra)
            data["sku"] = f"OK-{i}"
            s = ProductVariantWriteSerializer(data=data)
            self.assertTrue(s.is_valid(), s.errors)

    def test_accepts_descriptive_name_and_trims(self):
        data = self.payload(name="  Red / Large  ")
        data["sku"] = "OK-RL"
        s = ProductVariantWriteSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["name"], "Red / Large")

    def test_rejects_each_generic_spelling(self):
        for i, name in enumerate(GENERIC_SPELLINGS):
            data = self.payload(name=name)
            data["sku"] = f"BAD-{i}"
            s = ProductVariantWriteSerializer(data=data)
            self.assertFalse(s.is_valid(), name)
            self.assertEqual(s.errors["name"], [GENERIC_VARIANT_NAME_MESSAGE], name)

    def test_partial_update_without_name_is_unaffected(self):
        variant = self.make_variant(self.make_product("Legacy"), "LEG-1", "Default")
        s = ProductVariantWriteSerializer(variant, data={"quantity": 9}, partial=True)
        self.assertTrue(s.is_valid(), s.errors)
        s.save()
        variant.refresh_from_db()
        self.assertEqual(variant.quantity, 9)
        self.assertEqual(variant.name, "Default")

    def test_partial_update_sending_generic_name_is_rejected(self):
        variant = self.make_variant(self.make_product("Legacy2"), "LEG-2", "Red")
        s = ProductVariantWriteSerializer(variant, data={"name": "Default"}, partial=True)
        self.assertFalse(s.is_valid())
        self.assertIn("name", s.errors)


class VariantNameApiTests(VariantFixtureMixin, TestCase):
    def client_for_seller(self):
        c = APIClient()
        c.force_authenticate(self.user)
        return c

    def test_api_post_generic_name_is_400_and_blank_is_201(self):
        product = self.make_product("API product")
        c = self.client_for_seller()
        body = {"product": str(product.pk), "sku": "API-1", "price": "9.00", "quantity": 2}
        res = c.post(f"{BASE}variants/", {**body, "name": "Default"}, format="json")
        self.assertEqual(res.status_code, 400, res.content)
        self.assertEqual(res.json()["name"], [GENERIC_VARIANT_NAME_MESSAGE])
        res = c.post(f"{BASE}variants/", {**body, "name": ""}, format="json")
        self.assertEqual(res.status_code, 201, res.content)

    def test_api_patch_other_fields_on_legacy_generic_variant_still_works(self):
        variant = self.make_variant(self.make_product("API legacy"), "API-2", "Default")
        res = self.client_for_seller().patch(
            f"{BASE}variants/{variant.pk}/", {"quantity": 11}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.content)
        variant.refresh_from_db()
        self.assertEqual(variant.quantity, 11)


class ClearGenericVariantNamesCommandTests(VariantFixtureMixin, TestCase):
    def setUp(self):
        # Single-variant products.
        self.s_default = self.make_variant(self.make_product("S1"), "S-DEF", "Default")
        self.s_dash = self.make_variant(self.make_product("S2"), "S-DASH", "-")
        self.s_sku = self.make_variant(self.make_product("S3"), "SKU-ABC-01", "sku-abc-01")
        legacy_product = self.make_product("S4")
        self.s_legacy = self.make_variant(legacy_product, "S-LEG", f"{legacy_product.name} — Variant 1")
        self.s_real = self.make_variant(self.make_product("S5"), "S-REAL", "Red / Large")
        self.s_blank = self.make_variant(self.make_product("S6"), "S-BLANK", "")
        # Multi-variant product with a generic name on one variant.
        multi = self.make_product("M1")
        self.m_default = self.make_variant(multi, "M-1", "Default")
        self.m_real = self.make_variant(multi, "M-2", "Blue / Small")

    def run_cmd(self, *args):
        out, err = StringIO(), StringIO()
        call_command("clear_generic_variant_names", *args, stdout=out, stderr=err)
        return out.getvalue(), err.getvalue()

    def names(self):
        return {v.sku: v.name for v in ProductVariant.objects.all()}

    def test_dry_run_changes_nothing_and_reports(self):
        before = self.names()
        stamps = {v.pk: v.updated_at for v in ProductVariant.objects.all()}
        out, _ = self.run_cmd()
        self.assertEqual(self.names(), before)
        self.assertEqual({v.pk: v.updated_at for v in ProductVariant.objects.all()}, stamps)
        self.assertIn("DRY-RUN", out)
        self.assertIn(f"variant={self.s_default.pk}", out)
        self.assertIn("old_name='Default'", out)
        self.assertIn("single-variant matches=4", out)
        self.assertIn("multi-variant reported=1", out)

    def test_apply_clears_only_single_variant_placeholders(self):
        out, _ = self.run_cmd("--apply")
        names = self.names()
        for sku in ("S-DEF", "S-DASH", "SKU-ABC-01", "S-LEG", "S-BLANK"):
            self.assertEqual(names[sku], "", sku)
        self.assertEqual(names["S-REAL"], "Red / Large")
        self.assertEqual(names["M-1"], "Default")  # multi-variant left alone
        self.assertEqual(names["M-2"], "Blue / Small")
        self.assertIn("cleared=4", out)
        self.assertIn(f"variant={self.m_default.pk}", out)  # reported for the seller

    def test_apply_is_idempotent(self):
        self.run_cmd("--apply")
        snapshot = self.names()
        out, _ = self.run_cmd("--apply")
        self.assertEqual(self.names(), snapshot)
        self.assertIn("cleared=0", out)
        self.assertIn("single-variant matches=0", out)

    def test_refuses_remote_host_without_flag(self):
        before = self.names()
        with mock.patch(
            "apps.products.management.commands.clear_generic_variant_names.database_host",
            return_value="db.proxy.rlwy.net",
        ):
            with self.assertRaises(CommandError):
                self.run_cmd("--apply")
        self.assertEqual(self.names(), before)

    def test_remote_host_with_flag_warns_and_runs(self):
        with mock.patch(
            "apps.products.management.commands.clear_generic_variant_names.database_host",
            return_value="db.proxy.rlwy.net",
        ):
            out, err = self.run_cmd("--i-know-this-is-remote")  # still a dry-run
        self.assertIn("REMOTE", err)
        self.assertIn("DRY-RUN", out)
        self.assertEqual(self.names()["S-DEF"], "Default")
