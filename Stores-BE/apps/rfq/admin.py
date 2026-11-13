from django.contrib import admin

from .models import RFQ, Quote, RFQAttachment


class _ReadOnlyAdmin(admin.ModelAdmin):
    """Lifecycle rows are changed only through the services (state machine, locks, notifications)."""

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.get_fields() if getattr(f, "concrete", False)]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RFQ)
class RFQAdmin(_ReadOnlyAdmin):
    list_display = ("reference", "title", "buyer", "status", "quote_count", "closes_at")
    list_filter = ("status",)
    search_fields = ("reference", "title")
    list_select_related = ("buyer",)
    date_hierarchy = "closes_at"


@admin.register(Quote)
class QuoteAdmin(_ReadOnlyAdmin):
    list_display = ("rfq", "supplier", "total_price", "shipping_cost", "status")
    list_filter = ("status",)
    list_select_related = ("rfq", "supplier")


@admin.register(RFQAttachment)
class RFQAttachmentAdmin(_ReadOnlyAdmin):
    list_display = ("filename", "rfq", "size")
    list_select_related = ("rfq",)
