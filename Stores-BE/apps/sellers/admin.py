from django.contrib import admin

from .models import SellerDocument, SellerProfile


class SellerDocumentInline(admin.TabularInline):
    model = SellerDocument
    extra = 0
    readonly_fields = ("created_on",)


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ("business_name", "user", "verification_status", "is_verified", "is_active")
    list_filter = ("verification_status", "is_active", "business_type")
    search_fields = ("business_name", "business_email", "user__email")
    inlines = [SellerDocumentInline]


@admin.register(SellerDocument)
class SellerDocumentAdmin(admin.ModelAdmin):
    list_display = ("seller", "kind", "status", "created_on")
    list_filter = ("kind", "status")
