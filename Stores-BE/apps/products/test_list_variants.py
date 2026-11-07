"""Compact ``variants`` + ``default_variant`` on product LIST rows (storefront card swatches)."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.catalog.models import Attribute, AttributeValue, Brand, Category, SubCategory
from apps.merchandising.models import HomepageSection, HomepageSectionItem
from apps.merchandising.services import resolve_section_products
from apps.merchandising.serializers import HomepageSectionSerializer
from apps.sellers.models import SellerProfile

from .models import Product, ProductImage, ProductVariant

User = get_user_model()
BASE = "/tradehut/api/v1/products/"
LIST_PATHS = ["catalog/", "", "search/", "featured/", "new_arrivals/", "discounted/", "popular/"]
COLOURS = ["Red", "Blue", "Green", "Black", "White", "Pink", "Gold", "Grey"]


def rows_of(res):
    data = res.json()
    return data["results"] if isinstance(data, dict) else data


class ListVariantTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = Category.objects.create(name="Phones")
        cls.sub = SubCategory.objects.create(sub_category_name="Smart", category=cls.category)
        cls.brand = Brand.objects.create(name="Acme", category=cls.category)
        cls.colour = Attribute.objects.create(name="Colour", display_type="swatch")
        cls.size = Attribute.objects.create(name="Size")
        cls.colour_values = {
            n: AttributeValue.objects.create(
                attribute=cls.colour, value_name=n, color_code="#%06x" % (i * 1000 + 255)
            )
            for i, n in enumerate(COLOURS)
        }
        cls.size_values = {
            n: AttributeValue.objects.create(attribute=cls.size, value_name=n)
            for n in ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"]
        }
        cls.n = 0

    def product(self, name="P", seller_profile=None, **extra):
        type(self).n += 1
        extra.setdefault("status", "Active")
        return Product.objects.create(
            name=f"{name} {self.n}", keywords=name, category=self.category,
            sub_category=self.sub, brand=self.brand, seller_profile=seller_profile,
            main_product_image="main_product_images/x.jpg", **extra,
        )

    def variant(self, product, price="10.00", qty=5, values=(), image=False, main=True):
        type(self).n += 1
        v = ProductVariant.objects.create(
            product=product, sku=f"SKU-{self.n}", price=Decimal(price), quantity=qty
        )
        v.attribute_values.set(values)
        if image:
            img = ProductImage.objects.create(
                product=product, product_variant=v, is_main=main, image_type="main"
            )
            img.image.save(f"v{self.n}.jpg", ContentFile(b"x"), save=True)
        return v

    def coloured(self, n_colours, per_colour=1, **extra):
        prod = self.product(**extra)
        for i, name in enumerate(COLOURS[:n_colours]):
            for j in range(per_colour):
                self.variant(
                    prod, price=str(10 + i + j), values=[self.colour_values[name]] + (
                        [self.size_values[["S", "M", "L"][j]]] if per_colour > 1 else []
                    ), image=True,
                )
        return prod

    def get(self, path, **kw):
        res = APIClient().get(BASE + path, **kw)
        self.assertEqual(res.status_code, 200, res.content)
        return rows_of(res)

    # -- shape ---------------------------------------------------------------------------

    def test_rows_include_variants_and_default_variant_on_every_list(self):
        prod = self.coloured(2, is_product_of_the_month=True, discount_percentage=10)
        prod.default_variant = prod.variants.first()
        prod.save()
        for path in LIST_PATHS:
            with self.subTest(path=path):
                row = next(r for r in self.get(path) if str(r["id"]) == str(prod.pk))
                self.assertEqual(len(row["variants"]), 2)
                self.assertEqual(row["default_variant"], str(prod.default_variant_id))
                v = row["variants"][0]
                self.assertEqual(
                    set(v), {"id", "name", "price", "final_price", "quantity", "primary_image", "attribute_values"}
                )
                self.assertEqual(
                    set(v["attribute_values"][0]),
                    {"attribute_name", "value_name", "color_code", "image"},
                )

    def test_related_rows_include_variants(self):
        a = self.coloured(2)
        self.coloured(3)
        rows = self.get(f"{a.pk}/related/")
        self.assertEqual(len(rows), 1)
        self.assertEqual(len(rows[0]["variants"]), 3)

    def test_final_price_applies_product_discount(self):
        prod = self.product(discount_percentage=25)
        self.variant(prod, price="80.00", values=[self.colour_values["Red"]])
        v = self.get("catalog/")[0]["variants"][0]
        self.assertEqual(v["price"], "80.00")
        self.assertEqual(v["final_price"], "60.00")
        self.assertEqual(v["quantity"], 5)
        self.assertEqual(v["attribute_values"][0]["attribute_name"], "Colour")
        self.assertEqual(v["attribute_values"][0]["value_name"], "Red")
        self.assertEqual(v["attribute_values"][0]["color_code"], self.colour_values["Red"].color_code)

    def test_product_without_variants_returns_empty_list_and_null_default(self):
        self.product()
        row = self.get("catalog/")[0]
        self.assertEqual(row["variants"], [])
        self.assertIsNone(row["default_variant"])

    # -- capping -------------------------------------------------------------------------

    def test_eight_colours_cap_to_six_one_variant_per_colour(self):
        prod = self.coloured(8, per_colour=3)  # 24 variants, 8 colours
        row = self.get("catalog/")[0]
        self.assertEqual(len(row["variants"]), 6)
        colours = [
            next(a["value_name"] for a in v["attribute_values"] if a["attribute_name"] == "Colour")
            for v in row["variants"]
        ]
        self.assertEqual(len(set(colours)), 6)
        self.assertEqual(colours, COLOURS[:6])  # cheapest-first order, all in stock
        self.assertEqual(ProductVariant.objects.filter(product=prod).count(), 24)

    def test_lead_variant_is_cheapest_in_stock_for_its_colour(self):
        prod = self.product()
        red = self.colour_values["Red"]
        self.variant(prod, "5.00", qty=0, values=[red, self.size_values["S"]])
        in_stock = self.variant(prod, "9.00", qty=3, values=[red, self.size_values["M"]])
        self.variant(prod, "12.00", qty=4, values=[red, self.size_values["L"]])
        self.variant(prod, "7.00", qty=2, values=[self.colour_values["Blue"]])
        row = self.get("catalog/")[0]
        by_colour = {
            next(a["value_name"] for a in v["attribute_values"] if a["attribute_name"] == "Colour"): v
            for v in row["variants"]
        }
        self.assertEqual(len(row["variants"]), 2)
        self.assertEqual(by_colour["Red"]["id"], str(in_stock.pk))

    def test_all_out_of_stock_colour_falls_back_to_first(self):
        prod = self.product()
        a = self.variant(prod, "5.00", qty=0, values=[self.colour_values["Red"]])
        self.variant(prod, "7.00", qty=2, values=[self.colour_values["Blue"]])
        ids = [v["id"] for v in self.get("catalog/")[0]["variants"]]
        self.assertIn(str(a.pk), ids)
        self.assertEqual(len(ids), 2)

    def test_default_variant_not_a_lead_maps_to_its_colours_lead(self):
        prod = self.product()
        red = self.colour_values["Red"]
        lead = self.variant(prod, "5.00", values=[red, self.size_values["S"]])
        other = self.variant(prod, "9.00", values=[red, self.size_values["M"]])
        self.variant(prod, "7.00", values=[self.colour_values["Blue"]])
        prod.default_variant = other
        prod.save()
        row = self.get("catalog/")[0]
        self.assertEqual(row["default_variant"], str(lead.pk))
        self.assertIn(row["default_variant"], [v["id"] for v in row["variants"]])

    def test_size_only_product_is_capped_at_six_cheapest_first(self):
        prod = self.product()
        for i, name in enumerate(["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"]):
            self.variant(prod, price=str(20 - i), values=[self.size_values[name]])
        row = self.get("catalog/")[0]
        prices = [v["price"] for v in row["variants"]]
        self.assertEqual(len(prices), 6)
        self.assertEqual(prices, sorted(prices, key=Decimal))
        self.assertEqual(prices[0], "13.00")
        self.assertIn(row["default_variant"], [v["id"] for v in row["variants"]])

    def test_default_variant_outside_cheapest_six_is_included_for_non_colour(self):
        prod = self.product()
        vs = [
            self.variant(prod, price=str(10 + i), values=[self.size_values[n]])
            for i, n in enumerate(["XS", "S", "M", "L", "XL", "XXL", "3XL"])
        ]
        prod.default_variant = vs[-1]
        prod.save()
        row = self.get("catalog/")[0]
        self.assertEqual(len(row["variants"]), 6)
        self.assertEqual(row["default_variant"], str(vs[-1].pk))

    # -- images --------------------------------------------------------------------------

    def test_primary_image_is_absolute_url_when_image_exists(self):
        prod = self.product()
        self.variant(prod, values=[self.colour_values["Red"]], image=True)
        self.variant(prod, values=[self.colour_values["Blue"]], image=False)
        variants = {
            v["attribute_values"][0]["value_name"]: v for v in self.get("catalog/")[0]["variants"]
        }
        self.assertTrue(variants["Red"]["primary_image"].startswith("http"))
        self.assertIn("product_images/", variants["Red"]["primary_image"])
        self.assertIsNone(variants["Blue"]["primary_image"])

    def test_primary_image_prefers_is_main(self):
        prod = self.product()
        v = self.variant(prod, values=[self.colour_values["Red"]], image=True, main=False)
        main = ProductImage.objects.create(product=prod, product_variant=v, is_main=True)
        main.image.save("mainone.jpg", ContentFile(b"x"), save=True)
        row = self.get("catalog/")[0]
        self.assertIn("mainone", row["variants"][0]["primary_image"])

    # -- visibility ----------------------------------------------------------------------

    def test_unverified_seller_products_stay_hidden(self):
        user = User.objects.create_user(email="p@s.test", password="pass12345!")
        pending = SellerProfile.objects.create(
            user=user, business_name="Pending", verification_status="pending", is_verified=False
        )
        hidden = self.coloured(2, seller_profile=pending, is_product_of_the_month=True, discount_percentage=5)
        shown = self.coloured(2, is_product_of_the_month=True, discount_percentage=5)
        for path in LIST_PATHS:
            with self.subTest(path=path):
                ids = {str(r["id"]) for r in self.get(path)}
                self.assertIn(str(shown.pk), ids)
                self.assertNotIn(str(hidden.pk), ids)

    # -- homepage sections ---------------------------------------------------------------

    def test_homepage_section_products_carry_variants_without_per_product_queries(self):
        section = HomepageSection.objects.create(
            title="Picks", slug="picks", strategy="manual", section_type="grid", max_products=20
        )
        for i in range(3):
            HomepageSectionItem.objects.create(
                section=section, product=self.coloured(3), position=i
            )
        products = resolve_section_products(section, bypass_cache=True)
        with CaptureQueriesContext(connection) as ctx:
            data = HomepageSectionSerializer(
                section, context={"products": products}
            ).data
        self.assertEqual(ctx.captured_queries, [])
        self.assertEqual(len(data["products"]), 3)
        self.assertEqual(len(data["products"][0]["variants"]), 3)

    # -- query-count guard ---------------------------------------------------------------

    def _count(self, path):
        with CaptureQueriesContext(connection) as ctx:
            res = APIClient().get(BASE + path)
        self.assertEqual(res.status_code, 200)
        return len(ctx.captured_queries), len(rows_of(res))

    def test_query_count_does_not_grow_with_products_or_variants(self):
        for _ in range(2):
            self.coloured(3, per_colour=2, is_product_of_the_month=True, discount_percentage=5)
        small = {p: self._count(p) for p in ["catalog/", "", "search/", "featured/"]}
        for _ in range(8):
            self.coloured(6, per_colour=3, is_product_of_the_month=True, discount_percentage=5)
        large = {p: self._count(p) for p in ["catalog/", "", "search/", "featured/"]}
        for path in small:
            with self.subTest(path=path):
                self.assertEqual(small[path][1], 2)
                self.assertEqual(large[path][1], 10)
                self.assertEqual(small[path][0], large[path][0])

    def test_search_endpoint_query_count_does_not_grow(self):
        from apps.search.views import _base_queryset
        from apps.search.serializers import SearchProductSerializer

        def run():
            with CaptureQueriesContext(connection) as ctx:
                data = SearchProductSerializer(
                    list(_base_queryset(None)), many=True, context={"request": None}
                ).data
                list(data)
            return len(ctx.captured_queries), len(data)

        for _ in range(2):
            self.coloured(3)
        small = run()
        for _ in range(6):
            self.coloured(6, per_colour=2)
        large = run()
        self.assertEqual((small[1], large[1]), (2, 8))
        self.assertEqual(small[0], large[0])
