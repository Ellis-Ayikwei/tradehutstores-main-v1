from django.contrib import admin

from .models import Attribute, AttributeValue, Brand, Category, SubCategory, Tag


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "created_at", "updated_at")
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
