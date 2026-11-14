"""Sponsored products: purchase, payment settlement, review, refunds and the public selection (plan 26).

Rules that matter:
  * The price is copied from the package on the server and never changes afterwards.
  * "Live" is derived at query time (``live_promotions``); only the abandon sweep changes a status on its own.
  * Every money or status transition runs under ``select_for_update`` on the promotion row and re-checks the
    status inside the lock, so a webhook, a verify call, a seller cancel and a staff action racing each other
    settle exactly once.
  * Lock order: package -> product (purchase / approve), promotion first on the review paths.
  * A refund is requested at most once per promotion (``refund_status`` leaves ``none`` only once) and never for
    more than ``price_paid`` (also a DB check constraint). A failed refund is retried on the same row.
"""

import logging
import random
import uuid
from datetime import datetime, time, timedelta, timezone as dt_timezone
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import BooleanField, Exists, ExpressionWrapper, OuterRef, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.auctions.errors import ApiError
from apps.orders import payment_flow
from apps.orders.services import money
from apps.payments import paystack
from apps.products.models import Product, ProductVariant
from apps.products.visibility import visibility_q

from .sponsored_models import (
    REFERENCE_PREFIX,
    SURFACE_CATEGORY,
    SURFACE_HOME,
    SURFACE_PRODUCT,
    SURFACE_SEARCH,
    SponsoredPackage,
    SponsoredPromotion,
)

logger = logging.getLogger("tradehut.sponsored")

ABANDON_AFTER = timedelta(minutes=30)
MAX_START_AHEAD = timedelta(days=60)
SWEEP_BATCH = 200
CANDIDATE_CAP = 500
MAX_SEARCH_TERMS = 6
MAX_STAFF_RECIPIENTS = 50
SURFACE_LIMITS = {SURFACE_SEARCH: 2, SURFACE_CATEGORY: 2, SURFACE_HOME: 10, SURFACE_PRODUCT: 4}
SURFACE_LABELS = {
    SURFACE_SEARCH: "Search",
    SURFACE_CATEGORY: "Category pages",
    SURFACE_HOME: "the homepage",
    SURFACE_PRODUCT: "Product pages",
}

# Display statuses a client may filter on that are not stored values.
DERIVED_STATUSES = ("scheduled", "live", "paused", "ended")
STORED_STATUSES = tuple(value for value, _ in SponsoredPromotion.STATUS_CHOICES if value != SponsoredPromotion.STATUS_APPROVED)


# ---------------------------------------------------------------------------- pure rules


def prorated_refund(price_paid, starts_at, ends_at, now) -> Decimal:
    """Unused share of ``price_paid`` at ``now``, rounded DOWN to 2dp (the platform keeps the fraction of a pesewa).

    Before the start the whole price comes back; at or after the end nothing does. Integer arithmetic on
    pesewas and microseconds keeps the rounding exact."""
    price = money(price_paid)
    if now <= starts_at:
        return price
    if now >= ends_at:
        return Decimal("0.00")
    unit = timedelta(microseconds=1)
    pesewas = int(price * 100)
    refund_pesewas = pesewas * ((ends_at - now) // unit) // ((ends_at - starts_at) // unit)
    return (Decimal(refund_pesewas) / 100).quantize(Decimal("0.01"))


def check_starts_on(value, now=None):
    """``starts_on`` must be today (UTC) to 60 days ahead."""
    if value is None:
        return value
    today = (now or timezone.now()).date()
    if value < today or value > today + MAX_START_AHEAD:
        raise ValidationError({"starts_on": "Pick a start date from today to 60 days ahead."})
    return value


def window_start(starts_on, now) -> datetime:
    """When an approved promotion begins: as soon as approved, or the chosen day if that is later."""
    if starts_on is None:
        return now
    return max(now, datetime.combine(starts_on, time.min, tzinfo=dt_timezone.utc))


def display_status(promotion, now=None) -> str:
    """Client-facing status. ``promotion`` must come from ``with_listing_ok`` (it carries ``listing_ok``)."""
    if promotion.status != SponsoredPromotion.STATUS_APPROVED:
        return promotion.status
    now = now or timezone.now()
    if now < promotion.starts_at:
        return "scheduled"
    if now >= promotion.ends_at:
        return "ended"
    return "live" if promotion.listing_ok else "paused"


# --------------------------------------------------------------------------- querysets


def with_listing_ok(qs):
    """Annotate ``listing_ok``: the product is Active and in stock and the seller is active and not suspended."""
    in_stock = ProductVariant.objects.filter(product=OuterRef("product_id"), quantity__gt=0)
    showable = Q(product__status="Active", product__available=True, seller__is_active=True) & ~Q(
        seller__verification_status="suspended"
    )
    return qs.annotate(listing_ok=ExpressionWrapper(showable & Exists(in_stock), output_field=BooleanField()))


def promotions():
    return with_listing_ok(
        SponsoredPromotion.objects.select_related("seller", "product", "package").prefetch_related("product__product_images")
    )


def apply_status_filter(qs, status, now):
    """Filter by a stored status or a derived one (scheduled / live / paused / ended). Unknown values match nothing."""
    approved = SponsoredPromotion.STATUS_APPROVED
    if status in STORED_STATUSES:
        return qs.filter(status=status)
    if status == "scheduled":
        return qs.filter(status=approved, starts_at__gt=now)
    if status == "ended":
        return qs.filter(status=approved, ends_at__lte=now)
    if status in ("live", "paused"):
        return qs.filter(status=approved, starts_at__lte=now, ends_at__gt=now, listing_ok=(status == "live"))
    if status == approved:
        return qs.filter(status=approved)
    return qs.none()


def live_promotions(now=None):
    """Approved, inside the window, listing showable. The only definition of "live" on the server."""
    now = now or timezone.now()
    return promotions().filter(
        status=SponsoredPromotion.STATUS_APPROVED, starts_at__lte=now, ends_at__gt=now, listing_ok=True
    )


# ----------------------------------------------------------------------- notifications


def _notify(user_ids, kind, title, body, promotion, link=""):
    """Queue inbox rows for after the surrounding transaction commits. ``notify`` itself never raises."""
    from apps.notifications.services import notify

    ids = [uid for uid in user_ids if uid]
    data = {"promotion_id": str(promotion.pk)}

    def send():
        for uid in ids:
            notify(uid, kind, title, body, link, data=data)

    transaction.on_commit(send)


def _notify_seller(promotion, kind, title, body):
    _notify([promotion.seller.user_id], kind, title, body, promotion, f"/seller-central/promotions/{promotion.pk}")


def _notify_staff(promotion, kind, title, body):
    staff_ids = list(
        get_user_model().objects.filter(is_staff=True, is_active=True).values_list("pk", flat=True)[:MAX_STAFF_RECIPIENTS]
    )
    _notify(staff_ids, kind, title, body, promotion)


# --------------------------------------------------------------------------- packing rules


def _holding(now):
    """Promotions that currently hold a slot: unpaid or in review, or approved and not yet ended."""
    return Q(status__in=[SponsoredPromotion.STATUS_AWAITING_PAYMENT, SponsoredPromotion.STATUS_PENDING_REVIEW]) | Q(
        status=SponsoredPromotion.STATUS_APPROVED, ends_at__gt=now
    )


def _check_overlap(product_id, surfaces, now, *, exclude_pk=None, window=None):
    """409 ``already_promoted`` when the product already holds one of ``surfaces``.

    At purchase every holding promotion counts. At approval (``window`` given) only approved ones whose fixed
    window intersects the new one count."""
    qs = SponsoredPromotion.objects.filter(product_id=product_id).exclude(pk=exclude_pk)
    if window is None:
        qs = qs.filter(_holding(now))
    else:
        qs = qs.filter(status=SponsoredPromotion.STATUS_APPROVED, starts_at__lt=window[1], ends_at__gt=window[0])
    wanted = set(surfaces)
    for other in qs.only("surfaces", "ends_at", "status"):
        shared = [s for s in other.surfaces if s in wanted]
        if shared:
            until = f" until {other.ends_at:%d %b}" if other.ends_at else ""
            raise ApiError(
                409,
                "already_promoted",
                f"This listing already has a pending or running promotion on {SURFACE_LABELS[shared[0]]}{until}.",
                surface=shared[0],
            )


def _check_capacity(package, now, *, exclude_pk=None):
    """409 ``sold_out`` when the package already has ``max_concurrent`` holders. Caller holds the package lock."""
    if package.max_concurrent is None:
        return
    held = SponsoredPromotion.objects.filter(package=package).exclude(pk=exclude_pk).filter(_holding(now)).count()
    if held >= package.max_concurrent:
        raise ApiError(409, "sold_out", "This package is sold out right now. Try another package or check back later.")


# ---------------------------------------------------------------------------- purchase


def purchase(*, seller, user, product_id, package_id, starts_on, idempotency_key, now=None):
    """Create an ``awaiting_payment`` promotion and start the Paystack payment. Returns ``(promotion, created)``.

    A replayed ``idempotency_key`` returns the original row untouched. Paystack is called after the row is
    committed (never under a lock); if it fails the row is abandoned at once so it cannot block a retry."""
    now = now or timezone.now()
    existing = SponsoredPromotion.objects.filter(seller=seller, idempotency_key=idempotency_key).first()
    if existing:
        return existing, False
    if not paystack.is_configured():
        raise ApiError(503, "payments_unavailable", "Payments are not available right now. Try again shortly.")

    try:
        with transaction.atomic():
            package = SponsoredPackage.objects.select_for_update().filter(pk=package_id, is_active=True).first()
            if package is None:
                raise ApiError(404, "package_not_found", "That package is not available.")
            existing = SponsoredPromotion.objects.filter(seller=seller, idempotency_key=idempotency_key).first()
            if existing:
                return existing, False
            product = Product.objects.select_for_update().filter(pk=product_id, seller_profile=seller, status="Active").first()
            if product is None:
                raise ApiError(404, "product_not_found", "That listing was not found or is not active.")
            _check_overlap(product.pk, package.surfaces, now)
            _check_capacity(package, now)
            promotion_id = uuid.uuid4()
            promotion = SponsoredPromotion.objects.create(
                id=promotion_id,
                seller=seller,
                product=product,
                package=package,
                surfaces=list(package.surfaces),
                duration_days=package.duration_days,
                price_paid=package.price,
                currency=package.currency,
                source=SponsoredPromotion.SOURCE_SELLER,
                status=SponsoredPromotion.STATUS_AWAITING_PAYMENT,
                starts_on=starts_on,
                idempotency_key=idempotency_key,
                reference=f"{REFERENCE_PREFIX}{promotion_id.hex}",
            )
    except IntegrityError:
        # Same key from two requests that locked different packages: the unique constraint picked the winner.
        existing = SponsoredPromotion.objects.filter(seller=seller, idempotency_key=idempotency_key).first()
        if existing:
            return existing, False
        raise

    callback = f"{settings.SELLER_CENTRAL_URL.rstrip('/')}/seller-central/promotions/{promotion.pk}?paid=1"
    try:
        data = paystack.initialize(
            email=user.email,
            amount_minor=paystack.to_minor(promotion.price_paid),
            currency=promotion.currency,
            reference=promotion.reference,
            callback_url=callback,
            metadata={"kind": "sponsored", "promotion_id": str(promotion.pk)},
        )
        url = str(data.get("authorization_url") or "")
        if not url:
            raise paystack.PaystackError("Paystack returned no payment link.")
    except paystack.PaystackError as exc:
        SponsoredPromotion.objects.filter(pk=promotion.pk, status=SponsoredPromotion.STATUS_AWAITING_PAYMENT).update(
            status=SponsoredPromotion.STATUS_ABANDONED, updated_at=timezone.now()
        )
        logger.warning("Sponsored promotion %s: Paystack initialize failed (%s)", promotion.pk, exc)
        raise ApiError(503, "payments_unavailable", "Payments are not available right now. Try again shortly.") from exc

    promotion.authorization_url = url[:500]
    promotion.save(update_fields=["authorization_url", "updated_at"])
    return promotion, True


# ------------------------------------------------------------------ payment settlement


def mark_paid(reference, data, *, now=None) -> str:
    """Settle a promotion from gateway data (webhook body or ``paystack.verify`` result). Idempotent.

    Returns ``pending_review``, ``payment_problem``, ``late_payment`` (paid after the row was cancelled or
    abandoned; refunded in full), ``unknown`` or the status the row already had."""
    now = now or timezone.now()
    with transaction.atomic():
        promotion = SponsoredPromotion.objects.select_for_update(of=("self",)).select_related("product").filter(reference=reference).first()
        if promotion is None:
            logger.warning("Sponsored payment for an unknown reference")
            return "unknown"
        if promotion.paid_at is not None:
            return promotion.status

        safe = paystack.safe_payload(data)
        try:
            got_minor = int(data.get("requested_amount", data.get("amount")))
        except (TypeError, ValueError):
            got_minor = None
        got_currency = str(data.get("currency") or "").upper()
        if got_minor != paystack.to_minor(promotion.price_paid) or got_currency != promotion.currency:
            first_time = not promotion.payment_problem
            promotion.payment_problem = True
            promotion.provider_payload = safe
            promotion.save()
            logger.warning("Sponsored promotion %s: payment amount or currency mismatch", promotion.pk)
            if first_time:
                _notify_staff(
                    promotion,
                    "sponsored.payment_problem",
                    "Sponsored payment needs review",
                    "A payment did not match the package price. It was not approved.",
                )
            return "payment_problem"

        promotion.paid_at = now
        promotion.provider_payload = safe
        late = promotion.status != SponsoredPromotion.STATUS_AWAITING_PAYMENT
        if late:
            promotion.payment_problem = True
            _reserve_refund(promotion, promotion.price_paid, now)
        else:
            promotion.status = SponsoredPromotion.STATUS_PENDING_REVIEW
            _notify_staff(
                promotion,
                "sponsored.pending_review",
                "Sponsored promotion to review",
                f"A paid promotion for {promotion.product.name} is waiting for review.",
            )
        promotion.save()
        promotion_id = promotion.pk
    if late:
        logger.warning("Sponsored promotion %s: payment arrived after it was closed; refunding", promotion_id)
        submit_refund(promotion_id)
        return "late_payment"
    return SponsoredPromotion.STATUS_PENDING_REVIEW


def verify(promotion, *, now=None):
    """The seller's return page asks "did my payment go through?". Asks Paystack at most once per 2 seconds per
    promotion (the claim is a conditional UPDATE, so it holds across workers). Returns the fresh row."""
    now = now or timezone.now()
    if (
        promotion.status == SponsoredPromotion.STATUS_AWAITING_PAYMENT
        and promotion.authorization_url
        and paystack.is_configured()
    ):
        claimed = (
            SponsoredPromotion.objects.filter(pk=promotion.pk)
            .filter(Q(last_verified_at__isnull=True) | Q(last_verified_at__lt=now - timedelta(seconds=2)))
            .update(last_verified_at=now)
        )
        if claimed:
            try:
                data = paystack.verify(promotion.reference)
            except paystack.PaystackError as exc:
                logger.warning("Could not verify sponsored promotion %s (%s)", promotion.pk, exc)
                data = None
            if data and data.get("status") == "success":
                mark_paid(promotion.reference, data, now=now)
    return promotions().get(pk=promotion.pk)


def abandon_stale(*, now=None, limit=SWEEP_BATCH) -> dict:
    """Beat, every 30 minutes: ``awaiting_payment`` rows older than 30 minutes become ``abandoned``.

    A row with a payment link is checked with Paystack first, so a missed webhook settles it instead and a
    mobile-money approval still in flight is left alone. Rows flagged ``payment_problem`` are left for staff."""
    now = now or timezone.now()
    counts = {"abandoned": 0, "paid": 0, "skipped": 0, "errors": 0}
    stale = SponsoredPromotion.objects.filter(
        status=SponsoredPromotion.STATUS_AWAITING_PAYMENT,
        payment_problem=False,
        paid_at__isnull=True,
        created_on__lt=now - ABANDON_AFTER,
    ).order_by("created_on")
    for promotion in stale[:limit]:
        try:
            if promotion.authorization_url and paystack.is_configured():
                try:
                    data = paystack.verify(promotion.reference)
                except paystack.PaystackError as exc:
                    if not exc.not_found:
                        counts["skipped"] += 1
                        continue
                else:
                    gateway_status = str(data.get("status") or "").lower()
                    if gateway_status == "success":
                        mark_paid(promotion.reference, data, now=now)
                        counts["paid"] += 1
                        continue
                    if (
                        gateway_status in payment_flow.IN_FLIGHT
                        and now - promotion.created_on < ABANDON_AFTER + payment_flow.GIVE_UP_AFTER
                    ):
                        counts["skipped"] += 1
                        continue
            changed = SponsoredPromotion.objects.filter(
                pk=promotion.pk, status=SponsoredPromotion.STATUS_AWAITING_PAYMENT, paid_at__isnull=True
            ).update(status=SponsoredPromotion.STATUS_ABANDONED, updated_at=now)
            counts["abandoned"] += changed
        except Exception:  # noqa: BLE001 - one bad row must not stop the sweep
            logger.exception("Abandoning sponsored promotion %s failed", promotion.pk)
            counts["errors"] += 1
    return counts


# ---------------------------------------------------------------------------- refunds


def _reserve_refund(promotion, amount, now) -> bool:
    """Record a refund request on the row. Caller holds the row lock and saves. At most once per promotion."""
    amount = min(money(amount), money(promotion.price_paid))
    if amount <= 0 or promotion.refund_status != SponsoredPromotion.REFUND_NONE or promotion.paid_at is None:
        return False
    promotion.refunded_amount = amount
    promotion.refund_status = SponsoredPromotion.REFUND_PENDING
    promotion.refund_requested_at = now
    return True


def submit_refund(promotion_id, *, now=None) -> str:
    """Send a pending refund to Paystack. Call after the transaction that reserved it has committed. Never raises.

    A clear refusal marks the refund failed (staff can retry). A timeout leaves it pending and unconfirmed: the
    gateway may have accepted it, so it is never sent twice automatically."""
    promotion = SponsoredPromotion.objects.get(pk=promotion_id)
    if promotion.refund_status != SponsoredPromotion.REFUND_PENDING or promotion.provider_refund_id:
        return promotion.refund_status
    try:
        data = paystack.create_refund(
            reference=promotion.reference,
            amount_minor=paystack.to_minor(promotion.refunded_amount),
            currency=promotion.currency,
            merchant_note=f"Sponsored promotion {promotion.pk}",
        )
    except paystack.PaystackError as exc:
        if exc.refused:
            mark_refund_failed(promotion.pk)
        else:
            logger.warning("Sponsored promotion %s: refund outcome unknown (%s)", promotion.pk, exc)
        return SponsoredPromotion.objects.values_list("refund_status", flat=True).get(pk=promotion.pk)
    SponsoredPromotion.objects.filter(pk=promotion.pk).update(provider_refund_id=str(data.get("id") or "")[:64])
    if str(data.get("status") or "").lower() == "processed":
        return finalize_refund_success(promotion.pk, now=now)
    return SponsoredPromotion.REFUND_PENDING


def finalize_refund_success(promotion_id, *, now=None) -> str:
    """The gateway confirmed the money went back. Idempotent; also recovers a refund marked failed."""
    with transaction.atomic():
        promotion = SponsoredPromotion.objects.select_for_update(of=("self",)).select_related("seller").get(pk=promotion_id)
        if promotion.refund_status == SponsoredPromotion.REFUND_SUCCEEDED:
            return SponsoredPromotion.REFUND_SUCCEEDED
        if promotion.refund_status == SponsoredPromotion.REFUND_NONE:
            return SponsoredPromotion.REFUND_NONE
        promotion.refund_status = SponsoredPromotion.REFUND_SUCCEEDED
        promotion.save()
        _notify_seller(
            promotion,
            "sponsored.refund_succeeded",
            "Promotion refund sent",
            f"{promotion.refunded_amount} {promotion.currency} was refunded to your original payment method.",
        )
    return SponsoredPromotion.REFUND_SUCCEEDED


def mark_refund_failed(promotion_id) -> bool:
    """A pending refund did not go through. Only a pending refund can fail."""
    with transaction.atomic():
        promotion = SponsoredPromotion.objects.select_for_update().get(pk=promotion_id)
        if promotion.refund_status != SponsoredPromotion.REFUND_PENDING:
            return False
        promotion.refund_status = SponsoredPromotion.REFUND_FAILED
        promotion.save()
        _notify_staff(
            promotion,
            "sponsored.refund_failed",
            "Sponsored refund failed",
            "A promotion refund was refused by the payment gateway and needs a retry.",
        )
    return True


def retry_refund(promotion_id, *, now=None):
    """P12: staff retry a failed refund on the same row (same amount; never a second refund)."""
    now = now or timezone.now()
    with transaction.atomic():
        promotion = SponsoredPromotion.objects.select_for_update().filter(pk=promotion_id).first()
        if promotion is None:
            raise ApiError(404, "promotion_not_found", "Promotion not found.")
        if promotion.refund_status != SponsoredPromotion.REFUND_FAILED:
            raise ApiError(409, "not_retryable", "Only a failed refund can be retried.")
        promotion.refund_status = SponsoredPromotion.REFUND_PENDING
        promotion.provider_refund_id = ""
        promotion.refund_requested_at = now
        promotion.save()
    submit_refund(promotion_id, now=now)
    return promotions().get(pk=promotion_id)


def process_refund_event(event_name, data, *, now=None) -> str:
    """Handle ``refund.processed`` / ``refund.failed`` for a sponsored refund. Matches on the gateway refund id,
    else on the ``spn_`` transaction reference when exactly one refund is pending on it."""
    status = str(data.get("status") or "").lower()
    if event_name == "refund.processed" or status == "processed":
        succeeded = True
    elif event_name == "refund.failed" or status == "failed":
        succeeded = False
    else:
        return "ignored"
    promotion = None
    refund_id = str(data.get("id") or "")
    if refund_id:
        promotion = SponsoredPromotion.objects.filter(provider_refund_id=refund_id).first()
    if promotion is None:
        txn = data.get("transaction") if isinstance(data.get("transaction"), dict) else {}
        reference = str(txn.get("reference") or data.get("transaction_reference") or "")
        if reference.startswith(REFERENCE_PREFIX):
            matches = list(
                SponsoredPromotion.objects.filter(reference=reference, refund_status=SponsoredPromotion.REFUND_PENDING)[:2]
            )
            promotion = matches[0] if len(matches) == 1 else None
    if promotion is None:
        logger.warning("Sponsored refund event %s matched no promotion", event_name)
        return "unmatched"
    if succeeded:
        return finalize_refund_success(promotion.pk, now=now)
    return "failed" if mark_refund_failed(promotion.pk) else "unchanged"


# ----------------------------------------------------------------------- state changes


def _locked(promotion_id, **filters):
    promotion = (
        SponsoredPromotion.objects.select_for_update(of=("self",))
        .select_related("seller", "product")
        .filter(pk=promotion_id, **filters)
        .first()
    )
    if promotion is None:
        raise ApiError(404, "promotion_not_found", "Promotion not found.")
    return promotion


def cancel(promotion_id, *, seller, now=None):
    """P6: the seller cancels before approval. Unpaid: no refund. In review: full refund."""
    now = now or timezone.now()
    refund = False
    with transaction.atomic():
        promotion = _locked(promotion_id, seller=seller)
        if promotion.status == SponsoredPromotion.STATUS_AWAITING_PAYMENT and not promotion.payment_problem:
            promotion.status = SponsoredPromotion.STATUS_CANCELLED
        elif promotion.status == SponsoredPromotion.STATUS_PENDING_REVIEW:
            promotion.status = SponsoredPromotion.STATUS_CANCELLED
            refund = _reserve_refund(promotion, promotion.price_paid, now)
        else:
            raise ApiError(409, "not_cancellable", "Only a promotion that has not been approved can be cancelled.")
        promotion.save()
    if refund:
        submit_refund(promotion_id, now=now)
    return promotions().get(pk=promotion_id)


def approve(promotion_id, *, staff, note="", now=None):
    """P9: pending_review -> approved. Fixes the window and re-checks overlap and capacity under the locks."""
    now = now or timezone.now()
    with transaction.atomic():
        promotion = _locked(promotion_id)
        if promotion.status != SponsoredPromotion.STATUS_PENDING_REVIEW:
            raise ApiError(409, "not_pending_review", "Only a promotion in review can be approved.")
        package = SponsoredPackage.objects.select_for_update().get(pk=promotion.package_id)
        Product.objects.select_for_update().filter(pk=promotion.product_id).first()
        starts_at = window_start(promotion.starts_on, now)
        ends_at = starts_at + timedelta(days=promotion.duration_days)
        _check_overlap(promotion.product_id, promotion.surfaces, now, exclude_pk=promotion.pk, window=(starts_at, ends_at))
        _check_capacity(package, now, exclude_pk=promotion.pk)
        promotion.status = SponsoredPromotion.STATUS_APPROVED
        promotion.starts_at, promotion.ends_at = starts_at, ends_at
        promotion.reviewed_by, promotion.reviewed_at, promotion.review_note = staff, now, (note or "")[:500]
        promotion.save()
        _notify_seller(
            promotion,
            "sponsored.approved",
            "Your promotion is approved",
            f"{promotion.product.name} will be promoted until {ends_at:%d %b %Y}.",
        )
    return promotions().get(pk=promotion_id)


def reject(promotion_id, *, staff, reason, now=None):
    """P10: pending_review -> rejected with a full refund."""
    now = now or timezone.now()
    with transaction.atomic():
        promotion = _locked(promotion_id)
        if promotion.status != SponsoredPromotion.STATUS_PENDING_REVIEW:
            raise ApiError(409, "not_pending_review", "Only a promotion in review can be rejected.")
        promotion.status = SponsoredPromotion.STATUS_REJECTED
        promotion.reviewed_by, promotion.reviewed_at, promotion.review_note = staff, now, reason[:500]
        refund = _reserve_refund(promotion, promotion.price_paid, now)
        promotion.save()
        _notify_seller(
            promotion,
            "sponsored.rejected",
            "Your promotion was not approved",
            f"{reason[:200]} Your payment is being refunded in full.",
        )
    if refund:
        submit_refund(promotion_id, now=now)
    return promotions().get(pk=promotion_id)


def stop(promotion_id, *, staff, refund, reason, now=None):
    """P11: approved -> stopped, before it ends. ``refund`` is ``prorata`` (unused time) or ``none``."""
    now = now or timezone.now()
    reserved = False
    with transaction.atomic():
        promotion = _locked(promotion_id)
        if promotion.status != SponsoredPromotion.STATUS_APPROVED or now >= promotion.ends_at:
            raise ApiError(409, "not_stoppable", "Only a running or scheduled promotion can be stopped.")
        promotion.status = SponsoredPromotion.STATUS_STOPPED
        promotion.stopped_by, promotion.stopped_at, promotion.stop_reason = staff, now, reason[:500]
        if refund == "prorata":
            amount = prorated_refund(promotion.price_paid, promotion.starts_at, promotion.ends_at, now)
            reserved = _reserve_refund(promotion, amount, now)
        promotion.save()
        _notify_seller(
            promotion,
            "sponsored.stopped",
            "Your promotion was stopped",
            f"{promotion.product.name} is no longer promoted."
            + (f" {promotion.refunded_amount} {promotion.currency} is being refunded." if reserved else ""),
        )
    if reserved:
        submit_refund(promotion_id, now=now)
    return promotions().get(pk=promotion_id)


def create_comp(*, staff, product_id, package_id, starts_on, note="", now=None):
    """P13: a free promotion, approved at once (price 0, no payment, no refund possible)."""
    now = now or timezone.now()
    with transaction.atomic():
        package = SponsoredPackage.objects.select_for_update().filter(pk=package_id, is_active=True).first()
        if package is None:
            raise ApiError(404, "package_not_found", "That package is not available.")
        product = (
            Product.objects.select_for_update()
            .filter(pk=product_id, status="Active", seller_profile__isnull=False)
            .select_related("seller_profile")
            .first()
        )
        if product is None:
            raise ApiError(404, "product_not_found", "That listing was not found or is not active.")
        starts_at = window_start(starts_on, now)
        ends_at = starts_at + timedelta(days=package.duration_days)
        _check_overlap(product.pk, package.surfaces, now)
        _check_capacity(package, now)
        promotion = SponsoredPromotion.objects.create(
            seller=product.seller_profile,
            product=product,
            package=package,
            surfaces=list(package.surfaces),
            duration_days=package.duration_days,
            price_paid=Decimal("0.00"),
            currency=package.currency,
            source=SponsoredPromotion.SOURCE_STAFF,
            status=SponsoredPromotion.STATUS_APPROVED,
            starts_on=starts_on,
            starts_at=starts_at,
            ends_at=ends_at,
            idempotency_key=f"staff-{uuid.uuid4().hex}",
            reviewed_by=staff,
            reviewed_at=now,
            review_note=(note or "")[:500],
        )
        _notify_seller(
            promotion,
            "sponsored.approved",
            "A free promotion was added",
            f"{product.name} will be promoted until {ends_at:%d %b %Y}.",
        )
    return promotions().get(pk=promotion.pk)


# ----------------------------------------------------------------------- public read


def uuid_or_none(value):
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


def select_for_surface(surface, *, q="", category="", product="", limit=None, now=None):
    """P15: ``[(promotion_id, product_id)]`` live for ``surface``, random among the eligible, one per product.

    Anything missing or malformed yields an empty list. ``surfaces`` is a JSON list, so it is matched here
    rather than in SQL (the live set is small: one row per paying promotion)."""
    if surface not in SURFACE_LIMITS:
        return []
    try:
        limit = max(1, min(int(limit), 12)) if limit not in (None, "") else SURFACE_LIMITS[surface]
    except (TypeError, ValueError):
        limit = SURFACE_LIMITS[surface]
    qs = live_promotions(now).filter(visibility_q(None, "product__") or Q())

    if surface == SURFACE_SEARCH:
        terms = (q or "").split()[:MAX_SEARCH_TERMS]
        if not terms:
            return []
        for term in terms:
            qs = qs.filter(Q(product__name__icontains=term) | Q(product__category__name__icontains=term))
    elif surface == SURFACE_CATEGORY:
        category = (category or "").strip()[:255]
        if not category:
            return []
        ident = uuid_or_none(category)
        if ident:
            qs = qs.filter(Q(product__category_id=ident) | Q(product__sub_category_id=ident))
        else:
            qs = qs.filter(
                Q(product__category__name__iexact=category) | Q(product__sub_category__sub_category_name__iexact=category)
            )
    elif surface == SURFACE_PRODUCT:
        ident = uuid_or_none(product)
        category_id = Product.objects.filter(pk=ident).values_list("category_id", flat=True).first() if ident else None
        if category_id is None:
            return []
        qs = qs.filter(product__category_id=category_id).exclude(product_id=ident)

    rows = list(qs.values_list("pk", "product_id", "surfaces")[:CANDIDATE_CAP])
    random.shuffle(rows)
    picked, seen = [], set()
    for promotion_id, product_id, surfaces in rows:
        if surface in (surfaces or []) and product_id not in seen:
            seen.add(product_id)
            picked.append((promotion_id, product_id))
            if len(picked) == limit:
                break
    return picked
