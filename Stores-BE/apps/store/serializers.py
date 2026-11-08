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


# ─── Feature flags ────────────────────────────────────────────────────────────
from django.contrib.auth import get_user_model  # noqa: E402

from .models import FLAG_AUDIENCES, FeatureFlag  # noqa: E402


def _country_list(value, field):
    if not isinstance(value, list):
        raise serializers.ValidationError("Must be a list of ISO 3166-1 alpha-2 codes.")
    out = []
    for code in value:
        code = str(code).strip().upper()
        if len(code) != 2 or not code.isalpha():
            raise serializers.ValidationError(f"Invalid country code: {code!r}")
        if code not in out:
            out.append(code)
    return out


class FeatureFlagSerializer(serializers.ModelSerializer):
    beta_users = serializers.SerializerMethodField()
    beta_user_emails = serializers.ListField(child=serializers.EmailField(), write_only=True, required=False)

    class Meta:
        model = FeatureFlag
        fields = (
            "id", "key", "name", "description", "status", "audiences",
            "countries", "excluded_countries", "beta_users", "beta_user_emails",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_beta_users(self, obj):
        return [{"id": str(u.pk), "email": u.email} for u in obj.beta_users.all()]

    def validate_audiences(self, value):
        if not isinstance(value, list) or any(v not in FLAG_AUDIENCES for v in value):
            raise serializers.ValidationError(f"Each audience must be one of {list(FLAG_AUDIENCES)}.")
        return list(dict.fromkeys(value))

    def validate_countries(self, value):
        return _country_list(value, "countries")

    def validate_excluded_countries(self, value):
        return _country_list(value, "excluded_countries")

    def validate_key(self, value):
        if self.instance and value != self.instance.key:
            raise serializers.ValidationError("A flag key cannot be changed; code depends on it.")
        return value

    def _resolve_users(self, emails):
        User = get_user_model()
        users, missing = [], []
        for email in emails:
            user = User.objects.filter(email__iexact=email).first()
            (users if user else missing).append(user or email)
        if missing:
            raise serializers.ValidationError({"beta_user_emails": f"No account for: {', '.join(missing)}"})
        return users

    def create(self, validated_data):
        emails = validated_data.pop("beta_user_emails", None)
        users = self._resolve_users(emails) if emails is not None else None
        flag = super().create(validated_data)
        if users is not None:
            flag.beta_users.set(users)
        return flag

    def update(self, instance, validated_data):
        emails = validated_data.pop("beta_user_emails", None)
        users = self._resolve_users(emails) if emails is not None else None
        flag = super().update(instance, validated_data)
        if users is not None:
            flag.beta_users.set(users)
        return flag
