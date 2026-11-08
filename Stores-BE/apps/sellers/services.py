"""Seller onboarding / KYC business rules.

Views stay thin; every state transition lives here.
"""

import logging
import re
import uuid

from django.contrib.auth.models import Group
from django.core.exceptions import ImproperlyConfigured
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status as http
from rest_framework.exceptions import APIException, ValidationError

from .models import SellerDocument, SellerProfile

logger = logging.getLogger(__name__)

SELLERS_GROUP = "Sellers"
MAX_DOCUMENTS_PER_SELLER = 30
MIN_REJECTION_NOTE_LENGTH = 10
MIN_DOCUMENT_REJECTION_NOTE_LENGTH = 5
MAX_SELLING_CATEGORIES = 10
OTHER_CATEGORY_MIN = 3
OTHER_CATEGORY_MAX = 80

# Fields a seller may no longer change on their own once verified.
KYC_LOCKED_FIELDS = (
    "business_name",
    "business_type",
    "business_phone",
    "business_address",
    "business_registration_number",
    "tax_id",
    "id_type",
    "id_number",
)


class SellerApiError(APIException):
    """Error body: {"detail": "<message>", "code": "<snake_code>", ...extra}."""

    def __init__(self, status_code, code, detail=None, **extra):
        super().__init__(detail=detail or code.replace("_", " ").capitalize())
        self.status_code = status_code
        self.detail = {"detail": str(self.detail), "code": code, **extra}


# --------------------------------------------------------------------------- phone

# Accepted Ghana mobile prefixes (after the leading 0), per the seller contract.
_GHANA_PREFIXES = ("24", "54", "55", "59", "53", "20", "50", "27", "57", "26", "56", "28")
_GHANA_PHONE_RE = re.compile(r"^(?:\+?233|0)(" + "|".join(_GHANA_PREFIXES) + r")(\d{7})$")
GHANA_PHONE_ERROR = (
    "Enter a valid Ghana mobile number, e.g. 024 000 0000."
)


def normalise_ghana_phone(value):
    """Return ``+233XXXXXXXXX`` or raise ``ValueError`` (message is user-facing)."""
    cleaned = re.sub(r"[\s\-().]", "", str(value or ""))
    match = _GHANA_PHONE_RE.match(cleaned)
    if not match:
        raise ValueError(GHANA_PHONE_ERROR)
    return f"+233{match.group(1)}{match.group(2)}"


# --------------------------------------------------------------------- documents

def required_document_kinds(profile):
    kinds = ["id_card"]
    # Two-sided ID types need the back; a passport has no back page.
    if profile.id_type in ("ghana_card", "drivers_licence", "voters_id"):
        kinds.append("id_card_back")
    kinds.append("proof_of_address")
    if profile.business_type == "registered_business":
        kinds.append("business_registration")
    return kinds


def missing_document_kinds(profile):
    """Required kinds with no usable (non-rejected) document. Uses prefetched docs."""
    have = {d.kind for d in profile.documents.all() if d.status not in ("rejected", "superseded")}
    return [k for k in required_document_kinds(profile) if k not in have]


# --------------------------------------------------------------------- categories

# letters (any script) / digits / space / & / - / , only: no URLs, emails or HTML.
_OTHER_CATEGORY_RE = re.compile(r"^[^\W_](?:[^\W_]|[ &,/\-])*$")


def clean_other_category(value):
    """Trim, collapse whitespace and validate the free-text category.

    Returns ``""`` for blank input; raises ``ValueError`` (user-facing) otherwise.
    """
    value = re.sub(r"\s+", " ", str(value or "")).strip()
    if not value:
        return ""
    if not OTHER_CATEGORY_MIN <= len(value) <= OTHER_CATEGORY_MAX:
        raise ValueError(
            f"Use {OTHER_CATEGORY_MIN} to {OTHER_CATEGORY_MAX} characters to describe your category."
        )
    if not _OTHER_CATEGORY_RE.match(value):
        raise ValueError("Use only letters, numbers, spaces, & - and commas (no links or email addresses).")
    return value


def has_selling_categories(profile):
    """True when the seller named at least one category or an 'other' one. Uses prefetched rows."""
    return bool((profile.other_category or "").strip()) or bool(profile.selling_categories.all())


def missing_profile_fields(profile):
    """Application fields still missing. Only pending/rejected applications are asked
    for categories; sellers created before the picker existed are never blocked."""
    if profile.verification_status in ("pending", "rejected") and not has_selling_categories(profile):
        return ["selling_categories"]
    return []


def ensure_account_writable(profile):
    """Writes are refused for suspended or deactivated sellers (reads stay allowed)."""
    if profile.verification_status == "suspended":
        raise SellerApiError(http.HTTP_403_FORBIDDEN, "seller_suspended", "This seller account is suspended.")
    if not profile.is_active:
        raise SellerApiError(http.HTTP_403_FORBIDDEN, "seller_inactive", "This seller account is not active.")


def add_document(profile, kind, file):
    ensure_account_writable(profile)
    try:
        with transaction.atomic():
            profile = SellerProfile.objects.select_for_update().get(pk=profile.pk)
            current = profile.documents.exclude(status="superseded")
            if current.count() >= MAX_DOCUMENTS_PER_SELLER:
                raise SellerApiError(
                    http.HTTP_409_CONFLICT, "too_many_documents", "Document limit reached."
                )
            if kind != "other":
                # A new upload supersedes earlier unapproved ones for the same slot.
                # Rows and files are kept (KYC audit trail), only hidden from the seller.
                current.filter(kind=kind).exclude(status="approved").update(status="superseded")
            return SellerDocument.objects.create(seller=profile, kind=kind, file=file)
    except ImproperlyConfigured:
        logger.exception("KYC storage is not configured")
        raise SellerApiError(
            http.HTTP_503_SERVICE_UNAVAILABLE,
            "kyc_storage_not_configured",
            "Document uploads are temporarily unavailable.",
        )


# ------------------------------------------------------------------------ notify

def _notify_seller(user_id, kind, title, body, link=""):
    """Best-effort in-app notification.

    ``apps.notifications.services.notify`` is delivered by BE-NTF-1; until it lands
    this is a no-op (logged), and it never raises into the caller.
    """
    try:
        from apps.notifications.services import notify
    except ImportError:
        logger.info("notifications service unavailable; skipped %s for %s", kind, user_id)
        return
    try:
        notify(user_id, kind, title, body, link)
    except Exception:  # notify() must never break a state transition
        logger.exception("seller notification failed (%s)", kind)


def refresh_seller_visibility(seller_id):
    """After commit: drop cached homepage sections and re-sync the search index,
    because the seller's products just became public or hidden."""

    def _run():
        try:
            from apps.merchandising.services import bust_all_section_caches

            bust_all_section_caches()
        except Exception:
            logger.exception("homepage cache bust failed for seller %s", seller_id)
        try:
            from django.conf import settings

            if getattr(settings, "SEARCH_ENABLE_ES", False):
                from apps.search.tasks import reindex_seller_products_task

                reindex_seller_products_task.delay(seller_id)
        except Exception:
            logger.exception("search reindex dispatch failed for seller %s", seller_id)

    transaction.on_commit(_run)


def _audit(actor, action):
    """Best-effort audit row; never breaks the transition."""
    try:
        from apps.activity.models import ActivityLog

        with transaction.atomic():
            ActivityLog.objects.create(
                user=actor if getattr(actor, "pk", None) else None,
                action=action[:255],
                ip_address="0.0.0.0",
            )
    except Exception:
        logger.exception("audit log failed: %s", action)
    logger.info("audit: %s (actor=%s)", action, getattr(actor, "pk", None))


# ----------------------------------------------------------------------- onboarding

def ensure_sellers_group(user):
    group, _ = Group.objects.get_or_create(name=SELLERS_GROUP)
    user.groups.add(group)


def create_seller_application(user, data):
    """Create a pending SellerProfile for ``user`` (409 ``already_seller`` if one exists)."""
    already = SellerApiError(http.HTTP_409_CONFLICT, "already_seller", "You already have a seller account.")
    if SellerProfile.objects.filter(user=user).exists():
        raise already
    data = dict(data)
    categories = data.pop("selling_categories", [])
    extra = {}
    for attempt in range(3):
        try:
            with transaction.atomic():
                profile = SellerProfile.objects.create(
                    user=user, verification_status="pending", is_verified=False, **data, **extra
                )
                if categories:
                    profile.selling_categories.set(categories)
                ensure_sellers_group(user)
            return profile
        except IntegrityError:
            if SellerProfile.objects.filter(user=user).exists():
                raise already
            # Lost a race for the generated store slug: retry with a unique suffix.
            base = slugify(data.get("business_name", "")) or "store"
            extra = {"store_slug": f"{base}-{uuid.uuid4().hex[:6]}"}
    raise SellerApiError(http.HTTP_409_CONFLICT, "slug_conflict", "Please try submitting again.")


def ensure_owner_profile(user):
    """Give the platform owner (superuser) their own verified store, once.

    Idempotent and race-safe (``get_or_create`` on the one-to-one ``user``). Never
    touches non-superusers. The store slug comes from ``SellerProfile.save``; if two
    creates collide on it, retry with a unique suffix like onboarding does.
    """
    if not (user and user.is_authenticated and getattr(user, "is_superuser", False)):
        return None
    existing = SellerProfile.objects.filter(user=user).first()
    if existing is not None:
        return existing

    name = user.get_full_name().strip() or (user.email or "").split("@")[0] or "Owner"
    defaults = {
        "business_name": f"{name} (TradeHut)"[:255],
        "business_email": user.email or None,
        "verification_status": "verified",
        "is_verified": True,
        "verification_date": timezone.now(),
        "is_active": True,
        "is_accepting_orders": True,
        "commission_rate": 0,
    }
    for _attempt in range(3):
        try:
            with transaction.atomic():
                profile, created = SellerProfile.objects.get_or_create(user=user, defaults=defaults)
                if created:
                    ensure_sellers_group(user)
            return profile
        except IntegrityError:
            existing = SellerProfile.objects.filter(user=user).first()
            if existing is not None:
                return existing
            # Lost a race for the generated store slug: retry with a unique suffix.
            base = slugify(defaults["business_name"]) or "store"
            defaults = {**defaults, "store_slug": f"{base}-{uuid.uuid4().hex[:6]}"}
    raise SellerApiError(http.HTTP_409_CONFLICT, "slug_conflict", "Please try again.")


def resubmit_application(profile):
    if profile.verification_status != "rejected":
        raise SellerApiError(
            http.HTTP_409_CONFLICT, "not_rejected", "Only a rejected application can be resubmitted."
        )
    missing = missing_document_kinds(profile)
    # Resubmitting needs categories too (older applications predate the picker).
    missing_fields = [] if has_selling_categories(profile) else ["selling_categories"]
    if missing:
        raise SellerApiError(
            http.HTTP_400_BAD_REQUEST,
            "missing_documents",
            "Upload the required documents first.",
            missing=missing,
            missing_fields=missing_fields,
        )
    if missing_fields:
        raise SellerApiError(
            http.HTTP_400_BAD_REQUEST,
            "missing_categories",
            "Choose at least one category or describe it under Other.",
            missing=[],
            missing_fields=missing_fields,
        )
    return set_verification_status(profile, "pending")


# ------------------------------------------------------------------- verification

_STATUS_MESSAGES = {
    "verified": (
        "seller_verified",
        "Your seller account is verified",
        "Your store is now verified and your products can be shown to buyers.",
    ),
    "rejected": ("seller_rejected", "Your seller application needs changes", ""),
    "suspended": (
        "seller_suspended",
        "Your seller account is suspended",
        "Your products are hidden from buyers while the account is suspended.",
    ),
}


def set_verification_status(profile, new_status, *, notes=None, actor=None):
    """Single place that changes ``verification_status`` and keeps ``is_verified`` in sync."""
    valid = {c[0] for c in SellerProfile.VERIFICATION_STATUS_CHOICES}
    if new_status not in valid:
        raise ValidationError({"verification_status": [f"Must be one of: {', '.join(sorted(valid))}."]})

    note_text = (notes or "").strip() if notes is not None else None
    if new_status == "rejected" and len(note_text or "") < MIN_REJECTION_NOTE_LENGTH:
        raise ValidationError(
            {"verification_notes": [f"Give the seller a reason of at least {MIN_REJECTION_NOTE_LENGTH} characters."]}
        )

    with transaction.atomic():
        locked = SellerProfile.objects.select_for_update().get(pk=profile.pk)
        previous = locked.verification_status

        if new_status == "verified" and previous != "verified" and previous != "suspended":
            missing = missing_document_kinds(locked)
            if missing:
                raise SellerApiError(
                    http.HTTP_409_CONFLICT,
                    "missing_documents",
                    "Required documents are missing, so the application cannot be approved.",
                    missing=missing,
                )

        locked.verification_status = new_status
        locked.is_verified = new_status == "verified"
        update_fields = ["verification_status", "is_verified", "updated_at"]
        if new_status == "verified":
            if previous != "verified":
                locked.verification_date = timezone.now()
                update_fields.append("verification_date")
            if notes is None:
                locked.verification_notes = ""
                update_fields.append("verification_notes")
        if note_text is not None:
            locked.verification_notes = note_text
            update_fields.append("verification_notes")
        locked.save(update_fields=list(dict.fromkeys(update_fields)))

        if previous != new_status:
            refresh_seller_visibility(locked.pk)
            _audit(actor, f"seller_status:{locked.pk}:{previous}->{new_status}")
            if new_status in _STATUS_MESSAGES:
                kind, title, body = _STATUS_MESSAGES[new_status]
                if new_status == "rejected":
                    body = locked.verification_notes or ""
                transaction.on_commit(
                    lambda uid=locked.user_id, k=kind, t=title, b=body: _notify_seller(uid, k, t, b)
                )
    return locked


def review_document(document, new_status, note=""):
    if new_status not in ("approved", "rejected", "pending"):
        raise ValidationError({"status": ["Must be approved, rejected or pending."]})
    note = (note or "").strip()
    if new_status == "rejected" and len(note) < MIN_DOCUMENT_REJECTION_NOTE_LENGTH:
        raise ValidationError(
            {"note": [f"Say what is wrong with the document (at least {MIN_DOCUMENT_REJECTION_NOTE_LENGTH} characters)."]}
        )
    document.status = new_status
    document.note = note if new_status == "rejected" else ""
    document.save(update_fields=["status", "note", "updated_at"])
    return document
