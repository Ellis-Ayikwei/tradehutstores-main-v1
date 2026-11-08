from django.test import TestCase

from apps.catalog.models import Attribute, AttributeValue

from .models import ProductVariant
from .test_variant_names import VariantFixtureMixin


class VariantNamePropertyTests(VariantFixtureMixin, TestCase):
    """ProductVariant.variant_name joins every attribute value of the theme."""

    def setUp(self):
        self.size = Attribute.objects.create(name="Size")
        self.color = Attribute.objects.create(name="Color")
        self.large = AttributeValue.objects.create(attribute=self.size, value_name="Large")
        self.mustard = AttributeValue.objects.create(attribute=self.color, value_name="Mustard")

    def make(self, theme, *values):
        product = self.make_product(f"P-{theme}-{len(values)}")
        product.variation_theme = theme
        product.save()
        variant = ProductVariant.objects.create(product=product, sku=f"V-{theme}-{len(values)}", price=5)
        variant.attribute_values.set(values)
        return variant

    def test_multi_attribute_theme_joins_all_values_in_theme_order(self):
        variant = self.make("size-color", self.large, self.mustard)
        self.assertEqual(variant.variant_name, "Large, Mustard")

    def test_values_are_joined_not_reassigned_mid_loop(self):
        variant = self.make("color-size", self.large, self.mustard)
        self.assertEqual(variant.variant_name, "Mustard, Large")

    def test_missing_attribute_is_skipped(self):
        variant = self.make("size-color", self.mustard)
        self.assertEqual(variant.variant_name, "Mustard")

    def test_no_matching_values_gives_empty_string(self):
        variant = self.make("size-color")
        self.assertEqual(variant.variant_name, "")

    def test_single_attribute_theme(self):
        variant = self.make("color", self.mustard)
        self.assertEqual(variant.variant_name, "Mustard")
