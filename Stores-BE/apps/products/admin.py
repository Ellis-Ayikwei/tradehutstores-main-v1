from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import (
    Product,
    ProductVariant,
    ProductImage,
    Inventory,
    ProductDiscount,
    ProductKeyFeature,
    ProductView,
    ProductAnalytics,
)


class ProductVariantInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        if any(self.errors):
            return
        # Require at least one variant when saving a product.
        valid_forms = [
            form
            for form in self.forms
            if form.cleaned_data and not form.cleaned_data.get("DELETE", False)
        ]
        if len(valid_forms) < 1:
            raise ValidationError("A product must have at least one variant.")


class ProductVariantInline(admin.StackedInline):
    model = ProductVariant
    formset = ProductVariantInlineFormSet
    extra = 1
    fields = (
        "sku",
        "name",
        "price",
        "quantity",
        "min_buy_amount",
        "attribute_values",
    )
    autocomplete_fields = ("attribute_values",)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("product_variant", "image", "is_main", "image_type")
    readonly_fields = ("created_at", "updated_at")


class ProductKeyFeatureInline(admin.TabularInline):
    model = ProductKeyFeature
    extra = 1
    fields = ("name",)
    readonly_fields = ("created_at", "updated_at")


class InventoryInline(admin.TabularInline):
    model = Inventory
    extra = 0
    fields = ("quantity_in_stock", "restock_date")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "brand",
        "category",
        "sub_category",
        "variation_theme",
        "status",
        "available",
        "is_product_of_the_month",
        "discount_percentage",
        "average_rating",
        "total_reviews",
        "created_at",
    )
    list_filter = (
        "variation_theme",
        "status",
        "available",
        "brand",
        "category",
        "sub_category",
        "is_product_of_the_month",
    )
    search_fields = (
        "name",
        "slug",
        "brand__name",
        "category__name",
        "sub_category__sub_category_name",
    )
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = (
        "created_at",
        "updated_at",
        "variation_theme_live_hint",
        "average_rating",
        "total_reviews",
        "thin",
    )
    ordering = ("-created_at",)
    fieldsets = (
        (
            "Variations",
            {
                "description": (
                    "Pick a variation theme first, then add variant rows below and "
                    "assign attribute values (e.g. Size & Color) using the searchable widget."
                ),
                "fields": (
                    "variation_theme",
                    "variation_theme_live_hint",
                    "default_variant",
                ),
            },
        ),
        (
            "Basic",
            {
                "fields": (
                    ("name", "slug"),
                    "status",
                    "keywords",
                    "description",
                    "category",
                    "sub_category",
                    "brand",
                    "main_product_image",
                    "condition",
                    "available",
                ),
            },
        ),
        (
            "Commercial / inventory",
            {
                "fields": (
                    "seller",
                    "seller_profile",
                    "store",
                    "discount_percentage",
                    "min_amount",
                    "inventory_level",
                ),
            },
        ),
        (
            "Flags",
            {
                "fields": (
                    "is_spare_part",
                    "requires_installation",
                    "is_product_of_the_month",
                ),
            },
        ),
        (
            "SEO",
            {
                "classes": ("collapse",),
                "fields": ("meta_title", "meta_description"),
            },
        ),
        (
            "Ratings",
            {
                "fields": ("average_rating", "total_reviews"),
            },
        ),
        (
            "System",
            {
                "classes": ("collapse",),
                "fields": ("thin", "created_at", "updated_at"),
            },
        ),
    )
    inlines = [
        ProductVariantInline,
        ProductImageInline,
        ProductKeyFeatureInline,
        InventoryInline,
    ]

    class Media:
        js = ("products/admin/js/product_variation_theme_hint.js",)

    @admin.display(description="How variants map to attributes")
    def variation_theme_live_hint(self, obj):
        theme = (
            (getattr(obj, "variation_theme", None) or "single")
            if obj is not None
            else "single"
        )
        inner = self._variation_theme_help_inner(theme)
        return format_html(
            '<div id="variation-theme-dynamic-hint" class="help">{}</div>',
            inner,
        )

    @staticmethod
    def _variation_theme_help_inner(theme):
        if theme == "single":
            return mark_safe(
                "<p><strong>Single</strong>: one variant row; <em>Attribute values</em> are optional.</p>"
            )
        if theme == "custom":
            return mark_safe(
                "<p><strong>Custom</strong>: pick any attribute values per variant.</p>"
            )
        parts = [p.strip() for p in theme.split("-") if p.strip()]
        dims = ", ".join(parts)
        return format_html(
            "<p>For this theme, each variant should include one <em>Attribute value</em> per dimension "
            "whose <strong>Attribute name</strong> matches (case-insensitive): <strong>{}</strong>.</p>"
            "<p>Example: <code>size-color</code> → attribute names <code>size</code> and <code>color</code> "
            "in Catalog → Attributes.</p>",
            dims,
        )


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("product", "sku", "price", "quantity", "min_buy_amount")
    search_fields = ("sku", "product__name")
    list_filter = ("product",)
    filter_horizontal = ("attribute_values",)
    readonly_fields = ("created_at", "updated_at")
    fields = (
        "product",
        "sku",
        "name",
        "price",
        "quantity",
        "min_buy_amount",
        "attribute_values",
        "created_at",
        "updated_at",
    )


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("product", "product_variant", "is_main", "image_type", "created_at")
    list_filter = ("is_main", "image_type")
    search_fields = ("product__name", "product_variant__sku")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ("product", "quantity_in_stock", "restock_date", "created_at")
    search_fields = ("product__name",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ProductDiscount)
class ProductDiscountAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "discount",
        "new_price",
        "discount_start",
        "discount_end",
    )
    list_filter = ("discount_start", "discount_end")
    search_fields = ("product__name",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ProductKeyFeature)
class ProductKeyFeatureAdmin(admin.ModelAdmin):
    list_display = ("product", "name", "created_at")
    search_fields = ("product__name", "name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ProductView)
class ProductViewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "timestamp")
    list_filter = ("timestamp",)
    search_fields = ("product__name", "user__email")


@admin.register(ProductAnalytics)
class ProductAnalyticsAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "date",
        "views",
        "unique_views",
        "engagement_time",
        "bounce_rate",
    )
    list_filter = ("date",)
    search_fields = ("product__name",)
