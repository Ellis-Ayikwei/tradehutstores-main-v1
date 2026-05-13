"""
Serializer for the marketplace-wide StoreConfig singleton.

The model is intentionally flat (one column per setting) so the serializer
can stay generic. Tabs in the admin client send/receive only the subset of
fields they own — partial updates handle that natively.
"""

from rest_framework import serializers

from .models import StoreConfig


# Read-only fields the client must never overwrite. Anything else on the
# model is fair game for PATCH (admin-only).
READ_ONLY = ("id", "created_at", "updated_at")


class StoreConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreConfig
        fields = "__all__"
        read_only_fields = READ_ONLY

    # ── Defensive validators on JSON collections ────────────────────────────
    def validate_currency_enabled_display(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of ISO codes.")
        cleaned = []
        for code in value:
            if not isinstance(code, str) or len(code) != 3:
                raise serializers.ValidationError(f"Invalid currency code: {code!r}")
            cleaned.append(code.upper())
        # Always include the base currency.
        base = self.instance.currency_base if self.instance else "GHS"
        if base not in cleaned:
            cleaned.insert(0, base)
        # Dedupe preserving order.
        seen = set()
        out = []
        for c in cleaned:
            if c not in seen:
                seen.add(c)
                out.append(c)
        return out

    def validate_locale_enabled_languages(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of language codes.")
        return [str(c).lower() for c in value]

    def validate_payments_gateways(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of gateway objects.")
        for g in value:
            if not isinstance(g, dict) or "id" not in g:
                raise serializers.ValidationError(
                    "Each gateway must be a dict with at least an 'id'."
                )
        return value

    def validate_shipping_zones(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of zone objects.")
        return value

    def validate_shipping_methods(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of method objects.")
        return value

    def validate_tax_country_rates(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of {country, label, rate} objects.")
        for row in value:
            if not isinstance(row, dict) or "country" not in row or "rate" not in row:
                raise serializers.ValidationError(
                    "Each row must include 'country' and 'rate'."
                )
        return value

    def validate_currency_base(self, value):
        if not isinstance(value, str) or len(value) != 3:
            raise serializers.ValidationError("Base currency must be a 3-letter ISO code.")
        return value.upper()
