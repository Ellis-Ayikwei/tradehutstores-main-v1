from django.contrib import admin

from .models import (
    Attribute,
    AttributeValue,
    AttributeValueRequest,
    Brand,
    Category,
    SubCategory,
    Tag,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "show_on_home", "home_position", "tile_icon", "updated_at")
    list_filter = ("show_on_home",)
    search_fields = ("name", "description")
    ordering = ("name",)


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ("sub_category_name", "category", "created_at", "updated_at")
    list_filter = ("category",)
    search_fields = ("sub_category_name", "category__name")
    ordering = ("sub_category_name",)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "created_at", "updated_at")
    list_filter = ("category",)
    search_fields = ("name", "category__name")
    ordering = ("name",)


@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    list_display = ("name", "display_type", "created_at", "updated_at")
    list_filter = ("display_type",)
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(AttributeValue)
class AttributeValueAdmin(admin.ModelAdmin):
    list_display = ("value_name", "attribute", "color_code", "created_at", "updated_at")
    list_filter = ("attribute",)
    search_fields = ("value_name", "attribute__name")
    ordering = ("value_name",)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "product", "created_at", "updated_at")
    search_fields = ("name", "product__name")
    ordering = ("name",)

@admin.register(AttributeValueRequest)
class AttributeValueRequestAdmin(admin.ModelAdmin):
    list_display = ("value_name", "attribute", "status", "requested_by", "seller", "created_on")
    list_filter = ("status", "attribute")
    search_fields = ("value_name", "attribute__name", "requested_by__email", "seller__business_name")
    raw_id_fields = ("requested_by", "seller", "reviewed_by", "created_value")
    readonly_fields = ("created_on", "reviewed_at")
    ordering = ("-created_on",)
