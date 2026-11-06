import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.catalog.models import Category

from .models import SellerDocument, SellerProfile
from .storage import signed_file_url
from .services import (
    KYC_LOCKED_FIELDS,
    MAX_SELLING_CATEGORIES,
    SellerApiError,
    clean_other_category,
    missing_document_kinds,
    missing_profile_fields,
    normalise_ghana_phone,
)

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

# extension -> (allowed content types, magic-byte prefix)
_DOCUMENT_TYPES = {
    "pdf": ({"application/pdf"}, (b"%PDF",)),
    "jpg": ({"image/jpeg", "image/jpg", "image/pjpeg"}, (b"\xff\xd8\xff",)),
    "jpeg": ({"image/jpeg", "image/jpg", "image/pjpeg"}, (b"\xff\xd8\xff",)),
    "png": ({"image/png"}, (b"\x89PNG\r\n\x1a\n",)),
}

_GHANA_CARD_RE = re.compile(r"^GHA-?(\d{9})-?(\d)$")
_OTHER_ID_RE = re.compile(r"^[A-Z0-9][A-Z0-9\-/]{4,29}$")


def validate_document_file(file):
    if file.size > MAX_DOCUMENT_BYTES:
        raise serializers.ValidationError("File is too large (maximum 10 MB).")
    name = (file.name or "").lower()
    ext = name.rsplit(".", 1)[-1] if "." in name else ""
    if ext not in _DOCUMENT_TYPES:
        raise serializers.ValidationError("Only PDF, JPG or PNG files are accepted.")
    content_types, magics = _DOCUMENT_TYPES[ext]
    content_type = (getattr(file, "content_type", "") or "").split(";")[0].strip().lower()
    if content_type not in content_types:
        raise serializers.ValidationError("File type does not match its extension (PDF, JPG or PNG only).")
    head = file.read(8)
    file.seek(0)
    if not any(head.startswith(m) for m in magics):
        raise serializers.ValidationError("File content is not a valid PDF, JPG or PNG.")
    return file


def _same_value(field, new, old):
    """Unchanged-value check that tolerates the +233 phone normalisation."""
    if field == "business_phone":
        try:
            old = normalise_ghana_phone(old)
        except ValueError:
            pass
    return (new or "").strip() == (old or "").strip()


def _clean_phone(value):
    try:
        return normalise_ghana_phone(value)
    except ValueError as exc:
        raise serializers.ValidationError(str(exc))


def _clean_id_number(id_type, value):
    value = re.sub(r"\s+", "", value or "").upper()
    if id_type == "ghana_card":
        match = _GHANA_CARD_RE.match(value)
        if not match:
            raise serializers.ValidationError(
                {"id_number": ["Enter a valid Ghana Card number, e.g. GHA-123456789-0."]}
            )
        return f"GHA-{match.group(1)}-{match.group(2)}"
    if not _OTHER_ID_RE.match(value):
        raise serializers.ValidationError(
            {"id_number": ["Enter a valid ID number (5-30 letters, digits, - or /)."]}
        )
    return value


# ------------------------------------------------------------------ documents

class SellerDocumentSerializer(serializers.ModelSerializer):
    """Seller- and staff-facing document row. ``file_url`` is a short-lived signed
    URL (10 minutes) and is only ever issued on owner or staff endpoints."""

    file_url = serializers.SerializerMethodField()
    uploaded_at = serializers.DateTimeField(source="created_on", read_only=True)

    class Meta:
        model = SellerDocument
        fields = ["id", "kind", "status", "note", "file_url", "uploaded_at", "created_on"]
        read_only_fields = fields

    def get_file_url(self, obj):
        return signed_file_url(obj, self.context.get("request"))


class SellerDocumentUploadSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=SellerDocument.KIND_CHOICES)
    file = serializers.FileField(validators=[validate_document_file])


# ---------------------------------------------------------------- shared rules

CATEGORIES_REQUIRED_MESSAGE = "Choose at least one category or describe it under Other."


def category_rows(obj):
    """``[{id, name}]`` sorted by name; reads the prefetched M2M (no extra query)."""
    return [
        {"id": str(c.id), "name": c.name}
        for c in sorted(obj.selling_categories.all(), key=lambda c: (c.name or "").lower())
    ]


def selling_categories_field():
    return serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True, max_length=100
    )


class _CategoryRulesMixin:
    """``selling_categories`` / ``other_category`` rules for onboarding and PATCH.

    ``Category`` has no active/archived flag, so "active" means "exists".
    """

    categories_required = False

    def validate_selling_categories(self, value):
        ids = list(dict.fromkeys(value))  # duplicates ignored, order kept
        if len(ids) > MAX_SELLING_CATEGORIES:
            raise serializers.ValidationError(
                f"Choose at most {MAX_SELLING_CATEGORIES} categories."
            )
        found = {c.pk: c for c in Category.objects.filter(pk__in=ids)}
        if len(found) != len(ids):
            raise serializers.ValidationError("One or more selected categories do not exist.")
        return [found[i] for i in ids]

    def validate_other_category(self, value):
        try:
            return clean_other_category(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))

    def check_categories_present(self, attrs):
        instance = getattr(self, "instance", None)
        touched = "selling_categories" in attrs or "other_category" in attrs
        if not (self.categories_required or touched):
            return
        if "selling_categories" in attrs:
            categories = attrs["selling_categories"]
        else:
            categories = list(instance.selling_categories.all()) if instance else []
        if "other_category" in attrs:
            other = attrs["other_category"]
        else:
            other = instance.other_category if instance else ""
        if not categories and not (other or "").strip():
            if instance is not None and not (
                instance.other_category.strip() or instance.selling_categories.all()
            ):
                # Legacy seller with none on file re-sending the empty pair: nothing is
                # being cleared, so unrelated edits are not blocked.
                return
            raise serializers.ValidationError({"selling_categories": [CATEGORIES_REQUIRED_MESSAGE]})


class _IdentityRulesMixin(_CategoryRulesMixin):
    """Cross-field rules shared by onboarding and profile update."""

    def validate_business_phone(self, value):
        return _clean_phone(value)

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        def current(name):
            if name in attrs:
                return attrs[name]
            return getattr(instance, name, "") if instance else ""

        if instance is not None and instance.verification_status == "verified":
            changed = [
                f
                for f in KYC_LOCKED_FIELDS
                if f in attrs and not _same_value(f, attrs[f], getattr(instance, f))
            ]
            if changed:
                raise SellerApiError(
                    400,
                    "identity_locked",
                    "Identity and business details cannot be changed after your store is verified.",
                    fields=changed,
                )

        if current("business_type") == "registered_business" and not (
            current("business_registration_number") or ""
        ).strip():
            raise serializers.ValidationError(
                {"business_registration_number": ["Required for a registered business."]}
            )

        if "id_number" in attrs or "id_type" in attrs:
            id_type = current("id_type")
            if id_type and current("id_number"):
                attrs["id_number"] = _clean_id_number(id_type, current("id_number"))

        self.check_categories_present(attrs)
        return attrs


# ------------------------------------------------------------------ onboarding

class SellerOnboardingSerializer(_IdentityRulesMixin, serializers.Serializer):
    categories_required = True

    business_name = serializers.CharField(max_length=255)
    business_type = serializers.ChoiceField(choices=SellerProfile.BUSINESS_TYPE_CHOICES)
    business_description = serializers.CharField(required=False, allow_blank=True, max_length=5000)
    selling_categories = selling_categories_field()
    other_category = serializers.CharField(required=False, allow_blank=True, max_length=80)
    business_email = serializers.EmailField()
    business_phone = serializers.CharField(max_length=32)
    business_address = serializers.CharField(max_length=1000)
    business_registration_number = serializers.CharField(required=False, allow_blank=True, max_length=100)
    tax_id = serializers.CharField(required=False, allow_blank=True, max_length=100)
    id_type = serializers.ChoiceField(choices=SellerProfile.ID_TYPE_CHOICES)
    id_number = serializers.CharField(max_length=64)
    accept_terms = serializers.BooleanField()

    def validate_business_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Enter your business or store name.")
        return value

    def validate_accept_terms(self, value):
        if value is not True:
            raise serializers.ValidationError("You must accept the seller terms to apply.")
        return value

    def validated_profile_data(self):
        data = dict(self.validated_data)
        data.pop("accept_terms", None)
        return data


# ------------------------------------------------------------------ seller view

class SellerMeSerializer(serializers.ModelSerializer):
    """The seller's own profile. Bank number, routing number and ID number are
    never returned in full."""

    id_number_last4 = serializers.SerializerMethodField()
    bank_account_last4 = serializers.SerializerMethodField()
    verification_notes = serializers.SerializerMethodField()
    missing_documents = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    can_resubmit = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()
    selling_categories = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id", "email",
            "business_name", "business_type", "business_description", "business_email",
            "selling_categories", "other_category",
            "business_phone", "business_address", "business_registration_number", "tax_id",
            "id_type", "id_number_last4",
            "bank_name", "bank_account_name", "bank_account_last4",
            "store_slug", "store_logo", "store_banner",
            "return_policy", "shipping_policy", "terms_and_conditions",
            "website_url", "facebook_url", "instagram_url", "twitter_url",
            "is_active", "is_accepting_orders", "commission_rate",
            "is_verified", "verification_status", "verification_notes", "verification_date",
            "missing_documents", "missing_fields", "documents", "can_resubmit",
        ]
        read_only_fields = fields

    @staticmethod
    def _last4(value):
        value = (value or "").strip()
        return value[-4:] if value else ""

    def get_id_number_last4(self, obj):
        return self._last4(obj.id_number)

    def get_bank_account_last4(self, obj):
        return self._last4(obj.bank_account_number)

    def get_verification_notes(self, obj):
        # The note is the rejection reason; shown only while rejected.
        return (obj.verification_notes or "") if obj.verification_status == "rejected" else ""

    def get_missing_documents(self, obj):
        return missing_document_kinds(obj)

    def get_documents(self, obj):
        return SellerDocumentSerializer(
            [d for d in obj.documents.all() if d.status != "superseded"],
            many=True,
            context=self.context,
        ).data

    def get_can_resubmit(self, obj):
        return obj.verification_status == "rejected"

    def get_missing_fields(self, obj):
        return missing_profile_fields(obj)

    def get_selling_categories(self, obj):
        return category_rows(obj)


class SellerMeUpdateSerializer(_IdentityRulesMixin, serializers.ModelSerializer):
    selling_categories = selling_categories_field()
    bank_account_number = serializers.CharField(required=False, allow_blank=True, max_length=100, write_only=True)
    bank_routing_number = serializers.CharField(required=False, allow_blank=True, max_length=100, write_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "business_name", "business_type", "business_description", "business_email",
            "selling_categories", "other_category",
            "business_phone", "business_address", "business_registration_number", "tax_id",
            "id_type", "id_number",
            "bank_name", "bank_account_name", "bank_account_number", "bank_routing_number",
            "store_logo", "store_banner",
            "return_policy", "shipping_policy", "terms_and_conditions",
            "website_url", "facebook_url", "instagram_url", "twitter_url",
            "is_accepting_orders",
        ]
        extra_kwargs = {"id_number": {"write_only": True}}


# ----------------------------------------------------------------------- public

class SellerPublicSerializer(serializers.ModelSerializer):
    """Public store profile. No KYC, bank, email, phone or address fields."""

    rating = serializers.FloatField(read_only=True)
    name = serializers.CharField(source="business_name", read_only=True)
    slug = serializers.CharField(source="store_slug", read_only=True)
    description = serializers.CharField(source="business_description", read_only=True)
    logo = serializers.ImageField(source="store_logo", read_only=True)
    banner = serializers.ImageField(source="store_banner", read_only=True)
    review_count = serializers.IntegerField(source="total_reviews", read_only=True)
    order_count = serializers.IntegerField(source="total_orders", read_only=True)
    # [{id, name}] only. The free-text ``other_category`` is staff-only and never public.
    selling_categories = serializers.SerializerMethodField()

    def get_selling_categories(self, obj):
        return category_rows(obj)

    class Meta:
        model = SellerProfile
        fields = [
            "id", "business_name", "business_description", "store_slug", "selling_categories",
            "store_logo", "store_banner",
            "rating", "total_reviews", "total_orders",
            "name", "slug", "description", "logo", "banner", "review_count", "order_count",
            "is_verified", "is_accepting_orders",
            "return_policy", "shipping_policy",
            "website_url", "facebook_url", "instagram_url", "twitter_url",
        ]
        read_only_fields = fields


# ------------------------------------------------------------------------ staff

class _StaffUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email", "first_name", "last_name"]
        read_only_fields = fields


class AdminSellerListSerializer(serializers.ModelSerializer):
    user = _StaffUserSerializer(read_only=True)
    id_number_last4 = serializers.SerializerMethodField()
    missing_documents = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()
    # compact for the queue: category names only (detail returns [{id, name}])
    selling_categories = serializers.SerializerMethodField()
    total_sales = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id", "user",
            "business_name", "business_type", "business_description", "business_email",
            "business_phone", "business_address",
            "selling_categories", "other_category",
            "id_type", "id_number_last4",
            "verification_status", "is_verified", "verification_notes", "verification_date",
            "is_active", "is_accepting_orders", "commission_rate",
            "total_sales", "total_orders", "rating", "total_reviews",
            "store_logo", "store_banner", "store_slug",
            "missing_documents", "missing_fields", "documents_count",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_id_number_last4(self, obj):
        return (obj.id_number or "")[-4:]

    def get_missing_documents(self, obj):
        return missing_document_kinds(obj)

    def get_missing_fields(self, obj):
        return missing_profile_fields(obj)

    def get_selling_categories(self, obj):
        return sorted((c.name or "") for c in obj.selling_categories.all())

    def get_documents_count(self, obj):
        return len([d for d in obj.documents.all() if d.status != "superseded"])


class AdminSellerDetailSerializer(AdminSellerListSerializer):
    """Staff review view: includes the full ID number and the documents."""

    documents = serializers.SerializerMethodField()
    bank_account_last4 = serializers.SerializerMethodField()

    class Meta(AdminSellerListSerializer.Meta):
        fields = AdminSellerListSerializer.Meta.fields + [
            "id_number", "business_registration_number", "tax_id",
            "bank_name", "bank_account_name", "bank_account_last4",
            "return_policy", "shipping_policy", "documents",
        ]
        read_only_fields = fields

    def get_bank_account_last4(self, obj):
        return (obj.bank_account_number or "")[-4:]

    def get_selling_categories(self, obj):
        return category_rows(obj)

    def get_documents(self, obj):
        return SellerDocumentSerializer(obj.documents.all(), many=True, context=self.context).data


class AdminSellerUpdateSerializer(serializers.Serializer):
    verification_status = serializers.ChoiceField(
        choices=SellerProfile.VERIFICATION_STATUS_CHOICES, required=False
    )
    is_active = serializers.BooleanField(required=False)
    is_accepting_orders = serializers.BooleanField(required=False)
    verification_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    commission_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, min_value=0, max_value=100
    )


class AdminDocumentUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[c for c in SellerDocument.STATUS_CHOICES if c[0] != "superseded"]
    )
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)
