"""Attribute value requests: sellers ask, staff approve or reject.

Attribute values stay staff-managed. Every state change runs in a transaction
with the request row locked, so two staff members cannot review the same
request twice.
"""

import logging
import re

from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from django.db import transaction
from django.utils import timezone

from apps.sellers.models import SellerProfile
from apps.sellers.services import SellerApiError

from .models import Attribute, AttributeValue, AttributeValueRequest

logger = logging.getLogger(__name__)

MAX_PENDING_PER_SELLER = 20
MIN_REJECT_NOTE_LENGTH = 5
COLOR_CODE_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
COLOR_CODE_VALIDATOR = RegexValidator(COLOR_CODE_RE, "Enter a colour like #AABBCC.")

_WHITESPACE_RE = re.compile(r"\s+")


def normalise_value_name(value):
    """Trim and collapse inner whitespace; the seller's casing is kept."""
    return _WHITESPACE_RE.sub(" ", (value or "").strip())


def _with_relations(qs):
    return qs.select_related("attribute", "created_value")


# ------------------------------------------------------------------------ notify

def _notify(user_id, kind, title, body, link=""):
    """Best-effort in-app notification.

    ``apps.notifications.services.notify`` does not exist yet; until it lands this
    is a no-op (logged), and it never raises into the caller.
    """
    try:
        from apps.notifications.services import notify
    except ImportError:
        logger.info("notifications service unavailable; skipped %s for %s", kind, user_id)
        return
    try:
        notify(user_id, kind, title, body, link)
    except Exception:  # notify() must never break a state transition
        logger.exception("attribute value request notification failed (%s)", kind)


def _notify_staff(kind, title, body, link=""):
    User = get_user_model()
    for user_id in User.objects.filter(is_staff=True, is_active=True).values_list("pk", flat=True):
        _notify(user_id, kind, title, body, link)


def _notify_requester(req, kind, title, body):
    user_id = req.requested_by_id
    transaction.on_commit(lambda: _notify(user_id, kind, title, body, "/seller/products"))


# ------------------------------------------------------------------------ helpers

def find_existing_value(attribute, value_name):
    return AttributeValue.objects.filter(
        attribute=attribute, value_name__iexact=value_name
    ).first()


def ensure_seller_eligible(user):
    """Active seller with a pending or verified profile; returns the profile."""
    profile = getattr(user, "seller_profile", None) if user and user.is_authenticated else None
    if profile is None:
        raise SellerApiError(403, "not_a_seller", "You do not have a seller account.")
    if profile.verification_status == "suspended":
        raise SellerApiError(403, "seller_suspended", "This seller account is suspended.")
    if not profile.is_active:
        raise SellerApiError(403, "seller_inactive", "This seller account is not active.")
    if profile.verification_status not in ("pending", "verified"):
        raise SellerApiError(
            403, "seller_not_eligible", "Your seller account cannot request new values."
        )
    return profile


# ------------------------------------------------------------------------ create

def create_request(user, profile, attribute, value_name, color_code="", note=""):
    """Create a pending request, or raise a 409/429 SellerApiError."""
    from .serializers import AttributeValueRequestSerializer  # avoids an import cycle

    value_name = normalise_value_name(value_name)

    with transaction.atomic():
        # Serialise one seller's creates so the pending cap and duplicate check hold.
        SellerProfile.objects.select_for_update().filter(pk=profile.pk).first()

        existing = find_existing_value(attribute, value_name)
        if existing is not None:
            raise SellerApiError(
                409,
                "value_exists",
                "That value already exists. You can select it.",
                value={
                    "id": str(existing.pk),
                    "value_name": existing.value_name,
                    "color_code": existing.color_code,
                },
            )

        pending = AttributeValueRequest.objects.filter(
            seller=profile, status=AttributeValueRequest.STATUS_PENDING
        )
        duplicate = _with_relations(
            pending.filter(attribute=attribute, value_name__iexact=value_name)
        ).first()
        if duplicate is not None:
            raise SellerApiError(
                409,
                "already_requested",
                "You already requested this value. It is waiting for review.",
                request=AttributeValueRequestSerializer(duplicate).data,
            )

        if pending.count() >= MAX_PENDING_PER_SELLER:
            raise SellerApiError(
                429,
                "too_many_requests",
                "You have too many requests waiting for review. Please wait for staff to review them.",
            )

        req = AttributeValueRequest.objects.create(
            attribute=attribute,
            value_name=value_name,
            color_code=color_code or "",
            note=note or "",
            requested_by=user,
            seller=profile,
        )
        attr_name, store = attribute.name, profile.business_name

        transaction.on_commit(
            lambda: _notify_staff(
                "attribute_value_request",
                "New attribute value request",
                f"{store} asked for {attr_name}: {value_name}.",
                "/catalog/attribute-value-requests",
            )
        )
    return _with_relations(AttributeValueRequest.objects).get(pk=req.pk)


# ------------------------------------------------------------------------ review

def _lock_pending(request_id):
    """Lock the request row; 404 if missing, 409 ``already_reviewed`` if not pending."""
    req = (
        AttributeValueRequest.objects.select_for_update()
        .select_related("attribute")
        .filter(pk=request_id)
        .first()
    )
    if req is None:
        raise SellerApiError(404, "not_found", "Request not found.")
    if req.status != AttributeValueRequest.STATUS_PENDING:
        raise SellerApiError(409, "already_reviewed", "This request has already been reviewed.")
    return req


def approve_request(request_id, actor, value_name=None, color_code=None):
    """Create the AttributeValue, or link a case-insensitive match as ``duplicate``."""
    with transaction.atomic():
        req = _lock_pending(request_id)
        # Serialise value creation per attribute so two approvals cannot both create it.
        Attribute.objects.select_for_update().filter(pk=req.attribute_id).first()

        name = normalise_value_name(value_name) or req.value_name
        colour = req.color_code if color_code is None else color_code

        existing = find_existing_value(req.attribute, name)
        if existing is not None:
            value = existing
            req.status = AttributeValueRequest.STATUS_DUPLICATE
        else:
            value = AttributeValue.objects.create(
                attribute=req.attribute, value_name=name, color_code=colour or ""
            )
            req.status = AttributeValueRequest.STATUS_APPROVED

        req.created_value = value
        req.reviewed_by = actor
        req.reviewed_at = timezone.now()
        req.save(
            update_fields=["status", "created_value", "reviewed_by", "reviewed_at", "updated_at"]
        )

        if req.status == AttributeValueRequest.STATUS_APPROVED:
            body = f"{value.value_name} was added to {req.attribute.name}. You can now select it."
        else:
            body = f"{value.value_name} already exists in {req.attribute.name}. You can select it."
        _notify_requester(req, "attribute_value_request_approved", "Value request approved", body)

    return _with_relations(AttributeValueRequest.objects).get(pk=req.pk)


def reject_request(request_id, actor, review_note):
    review_note = (review_note or "").strip()
    if len(review_note) < MIN_REJECT_NOTE_LENGTH:
        raise SellerApiError(
            400,
            "review_note_required",
            f"A review note of at least {MIN_REJECT_NOTE_LENGTH} characters is required.",
        )
    with transaction.atomic():
        req = _lock_pending(request_id)
        req.status = AttributeValueRequest.STATUS_REJECTED
        req.review_note = review_note
        req.reviewed_by = actor
        req.reviewed_at = timezone.now()
        req.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at", "updated_at"])
        _notify_requester(
            req,
            "attribute_value_request_rejected",
            "Value request rejected",
            f"{req.value_name} was not added to {req.attribute.name}: {review_note}",
        )

    return _with_relations(AttributeValueRequest.objects).get(pk=req.pk)
