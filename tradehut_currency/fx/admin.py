"""
fx/admin.py

Admin for RateSnapshot — read-only view of rate history.
Also provides a manual "Refresh rates now" action for emergencies.
"""

from django.contrib import admin
from django.contrib import messages
from .models import RateSnapshot


@admin.register(RateSnapshot)
class RateSnapshotAdmin(admin.ModelAdmin):
    list_display  = ("base_currency", "is_current", "provider", "fetched_at", "rate_count")
    list_filter   = ("base_currency", "is_current", "provider")
    readonly_fields = ("base_currency", "rates", "fetched_at", "provider", "is_current")
    ordering      = ("-fetched_at",)

    def has_add_permission(self, request):
        return False  # snapshots are created by the system, not manually

    def has_change_permission(self, request, obj=None):
        return False  # immutable records

    @admin.display(description="Currencies")
    def rate_count(self, obj):
        return len(obj.rates) if obj.rates else 0

    actions = ["force_refresh"]

    @admin.action(description="Force refresh rates from FX provider now")
    def force_refresh(self, request, queryset):
        from django.core.cache import cache
        from .views import _fetch_from_provider, _persist_snapshot, CACHE_KEY, CACHE_KEY_FALLBACK, CACHE_TTL, FALLBACK_TTL, _build_payload

        rates = _fetch_from_provider()
        if rates:
            payload = _build_payload(rates, stale=False)
            cache.set(CACHE_KEY,          payload, CACHE_TTL)
            cache.set(CACHE_KEY_FALLBACK, payload, FALLBACK_TTL)
            _persist_snapshot(rates)
            self.message_user(request, f"Rates refreshed successfully. {len(rates)} currencies updated.")
        else:
            self.message_user(request, "FX provider unreachable. Rates not updated.", level=messages.ERROR)
