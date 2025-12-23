from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet
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


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    formset = ProductVariantInlineFormSet
    extra = 1
    fields = ("sku", "price", "quantity", "min_buy_amount", "name")
    readonly_fields = ("created_at", "updated_at")


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
        "status",
        "available",
        "is_product_of_the_month",
        "discount_percentage",
        "average_rating",
        "total_reviews",
        "created_at",
    )
    list_filter = (
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
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    inlines = [
        ProductVariantInline,
        ProductImageInline,
        ProductKeyFeatureInline,
        InventoryInline,
    ]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("product", "sku", "price", "quantity", "min_buy_amount")
    search_fields = ("sku", "product__name")
    list_filter = ("product",)
    readonly_fields = ("created_at", "updated_at")


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
