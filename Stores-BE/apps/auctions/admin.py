from django.contrib import admin, messages

from . import services
from .errors import ApiError
from .models import Auction, AuctionWatch, Bid


@admin.register(Auction)
class AuctionAdmin(admin.ModelAdmin):
    list_display = ("title", "seller", "status", "current_price", "bid_count", "starts_at", "ends_at", "result")
    list_filter = ("status", "result", "settlement_status")
    search_fields = ("title", "seller__business_name")
    list_select_related = ("seller",)
    date_hierarchy = "ends_at"
    actions = ["cancel_no_bids"]
    # Stock is reserved at creation and released by the services, so lifecycle fields
    # must not be hand-edited (a status edit would leak stock).
    readonly_fields = [f.name for f in Auction._meta.get_fields() if getattr(f, "concrete", False)]

    def has_add_permission(self, request):
        return False  # created through the seller API, which reserves stock

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.action(description="Cancel (no bids)")
    def cancel_no_bids(self, request, queryset):
        done = 0
        for auction_id in queryset.values_list("id", flat=True):
            try:
                services.cancel_auction(auction_id=auction_id, reason="Cancelled by staff")
                done += 1
            except ApiError as exc:
                self.message_user(
                    request, f"{auction_id}: {exc.detail['detail']}", level=messages.WARNING
                )
        if done:
            self.message_user(request, f"Cancelled {done} auction(s).", level=messages.SUCCESS)


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ("auction", "bidder", "amount", "is_buy_now", "placed_at")
    list_select_related = ("auction", "bidder")
    search_fields = ("auction__title",)
    readonly_fields = [f.name for f in Bid._meta.get_fields() if getattr(f, "concrete", False)]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuctionWatch)
class AuctionWatchAdmin(admin.ModelAdmin):
    list_display = ("auction", "user", "created_on")
    list_select_related = ("auction", "user")
