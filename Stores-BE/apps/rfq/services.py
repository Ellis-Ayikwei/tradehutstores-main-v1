"""RFQ business logic (plan 11 sections 4-5).

Lock order everywhere in this app: RFQ -> Quote -> Order. Every write path locks the
RFQ row first, which serializes submit / edit / withdraw / award / cancel / sweep per RFQ.
Views stay thin; every state transition and money rule lives here.
"""

import logging
import os
import secrets
from collections import Counter
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.auctions.errors import ApiError
from apps.auctions.services import q2
from apps.catalog.models import Category, SubCategory
from apps.notifications.services import notify
from apps.products.models import Product

from . import selectors
from .constants import (
    ATTACHMENT_TYPES,
    AWARD_GRACE,
    MAX_ATTACHMENT_BYTES,
    MAX_ATTACHMENTS,
    MAX_OPEN,
    MIN_OPEN,
    SWEEP_BATCH,
)
from .models import RFQ, Quote, RFQAttachment

logger = logging.getLogger(__name__)

REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
MAX_TOTAL = Decimal("1000000000000")  # Quote.total_price is Decimal(14,2)

DRAFT_FIELDS = frozenset(
    {
        "title",
        "description",
        "category_id",
        "sub_category_id",
        "quantity",
        "unit",
        "budget_min",
        "budget_max",
        "delivery_country",
        "delivery_city",
        "needed_by",
        "closes_at",
        "specs",
    }
)
OPEN_FIELDS = frozenset({"description", "specs", "closes_at"})
QUOTING_FIELDS = frozenset({"closes_at"})
QUOTE_FIELDS = ("unit_price", "shipping_cost", "lead_time_days", "valid_until", "notes")

# Leading bytes each allowed attachment type must start with (the declared type is client supplied).
MAGIC = {
    ".pdf": lambda head: head.startswith(b"%PDF"),
    ".png": lambda head: head.startswith(b"\x89PNG\r\n\x1a\n"),
    ".jpg": lambda head: head.startswith(b"\xff\xd8\xff"),
    ".jpeg": lambda head: head.startswith(b"\xff\xd8\xff"),
    ".webp": lambda head: head[:4] == b"RIFF" and head[8:12] == b"WEBP",
}


# --------------------------------------------------------------------------- helpers


def validate_closes_at(closes_at, now):
    """Quote deadline rule: between 24 hours and 60 days from now."""
    if not (now + MIN_OPEN <= closes_at <= now + MAX_OPEN):
        raise ValidationError(
            {"closes_at": ["The quote deadline must be between 24 hours and 60 days from now."]}
        )


def _currency_base() -> str:
    from apps.store.models import StoreConfig

    return StoreConfig.singleton().currency_base


def _lock_rfq(rfq_id, *, buyer=None) -> RFQ:
    qs = RFQ.objects.select_for_update(of=("self",))
    if buyer is not None:
        qs = qs.filter(buyer=buyer)
    try:
        return qs.get(pk=rfq_id)
    except (RFQ.DoesNotExist, ValueError, TypeError):
        raise ApiError(404, "rfq_not_found", "Request not found.")


def _recount(rfq: RFQ) -> None:
    rfq.quote_count = rfq.quotes.exclude(status=Quote.STATUS_WITHDRAWN).count()


def _release_quotes(rfq: RFQ, now) -> list:
    """Mark every still-submitted quote not_selected; returns those suppliers' user ids."""
    submitted = rfq.quotes.filter(status=Quote.STATUS_SUBMITTED)
    user_ids = list(submitted.values_list("supplier__user_id", flat=True))
    submitted.update(status=Quote.STATUS_NOT_SELECTED, updated_at=now)
    return user_ids


def _notify_many(user_ids, kind, title, body, link, data):
    for user_id in user_ids:
        notify(user_id, kind, title, body, link, data=data)


def _resolve_category(category_id, sub_category_id):
    category = Category.objects.filter(pk=category_id).first()
    if category is None:
        raise ApiError(404, "category_not_found", "Category not found.")
    sub = None
    if sub_category_id:
        sub = SubCategory.objects.filter(pk=sub_category_id, category=category).first()
        if sub is None:
            raise ValidationError({"sub_category_id": ["Choose a sub-category of the selected category."]})
    return category, sub


def _check_budget(rfq: RFQ) -> None:
    if rfq.budget_min is not None and rfq.budget_max is not None and rfq.budget_min > rfq.budget_max:
        raise ValidationError({"budget_max": ["Maximum budget must not be below the minimum."]})


# --------------------------------------------------------------------------- buyer: requests


def create_rfq(*, buyer, data: dict, idempotency_key: str):
    """Returns ``(rfq, created)``; ``created`` is False when the key was already used."""
    prior = RFQ.objects.filter(buyer=buyer, create_idempotency_key=idempotency_key).first()
    if prior:
        return prior, False

    now = timezone.now()
    category, sub = _resolve_category(data["category_id"], data.get("sub_category_id"))
    publish = data.get("publish", False)
    if publish:
        validate_closes_at(data["closes_at"], now)
    fields = dict(
        buyer=buyer,
        title=data["title"],
        description=data["description"],
        category=category,
        sub_category=sub,
        quantity=data["quantity"],
        unit=data.get("unit") or "units",
        budget_min=data.get("budget_min"),
        budget_max=data.get("budget_max"),
        currency=_currency_base(),
        delivery_country=data["delivery_country"],
        delivery_city=data.get("delivery_city", ""),
        needed_by=data.get("needed_by"),
        closes_at=data["closes_at"],
        specs=data.get("specs", []),
        status=RFQ.STATUS_OPEN if publish else RFQ.STATUS_DRAFT,
        published_at=now if publish else None,
        create_idempotency_key=idempotency_key,
    )
    for _ in range(3):
        reference = "RFQ-" + "".join(secrets.choice(REFERENCE_ALPHABET) for _ in range(8))
        try:
            with transaction.atomic():
                return RFQ.objects.create(reference=reference, **fields), True
        except IntegrityError:
            prior = RFQ.objects.filter(buyer=buyer, create_idempotency_key=idempotency_key).first()
            if prior:
                return prior, False
    raise RuntimeError("could not allocate a unique RFQ reference")


def update_rfq(*, buyer, rfq_id, data: dict) -> RFQ:
    """R4. Which fields may change depends on the state (draft: all; open without quotes: a few;
    quoting: extend the deadline only)."""
    with transaction.atomic():
        rfq = _lock_rfq(rfq_id, buyer=buyer)
        now = timezone.now()
        if rfq.status == RFQ.STATUS_DRAFT:
            allowed = DRAFT_FIELDS
        elif rfq.status == RFQ.STATUS_OPEN and rfq.quote_count == 0:
            allowed = OPEN_FIELDS
        elif rfq.status == RFQ.STATUS_QUOTING:
            allowed = QUOTING_FIELDS
        else:
            raise ApiError(409, "not_editable", "This request can no longer be edited.")
        blocked = sorted(set(data) - allowed)
        if blocked:
            raise ApiError(
                409, "not_editable", "These fields cannot be changed in the current state.", fields=blocked
            )

        if "category_id" in data or "sub_category_id" in data:
            category_id = data.get("category_id", rfq.category_id)
            sub_id = data["sub_category_id"] if "sub_category_id" in data else (
                rfq.sub_category_id if category_id == rfq.category_id else None
            )
            rfq.category, rfq.sub_category = _resolve_category(category_id, sub_id)
        closes_at = data.get("closes_at")
        if closes_at is not None and closes_at != rfq.closes_at:
            validate_closes_at(closes_at, now)
            if rfq.status == RFQ.STATUS_QUOTING and closes_at <= rfq.closes_at:
                raise ValidationError({"closes_at": ["The deadline can only be extended."]})
        for field, value in data.items():
            if field not in ("category_id", "sub_category_id"):
                setattr(rfq, field, value)
        _check_budget(rfq)
        rfq.save()
    return rfq


def publish_rfq(*, buyer, rfq_id) -> RFQ:
    """R5. draft -> open. Already open or quoting is returned unchanged."""
    with transaction.atomic():
        rfq = _lock_rfq(rfq_id, buyer=buyer)
        if rfq.status in (RFQ.STATUS_OPEN, RFQ.STATUS_QUOTING):
            return rfq
        if rfq.status != RFQ.STATUS_DRAFT:
            raise ApiError(409, "invalid_state", "This request cannot be published.")
        now = timezone.now()
        validate_closes_at(rfq.closes_at, now)
        rfq.status, rfq.published_at = RFQ.STATUS_OPEN, now
        rfq.save(update_fields=["status", "published_at", "updated_at"])
    return rfq


def cancel_rfq(*, buyer, rfq_id) -> RFQ:
    """R6. draft / open / quoting -> cancelled; submitted quotes become not_selected."""
    with transaction.atomic():
        rfq = _lock_rfq(rfq_id, buyer=buyer)
        if rfq.status == RFQ.STATUS_CANCELLED:
            return rfq
        if rfq.status not in (RFQ.STATUS_DRAFT, RFQ.STATUS_OPEN, RFQ.STATUS_QUOTING):
            raise ApiError(409, "not_cancellable", "This request can no longer be cancelled.")
        now = timezone.now()
        quoter_ids = _release_quotes(rfq, now)
        rfq.status, rfq.cancelled_at = RFQ.STATUS_CANCELLED, now
        rfq.save(update_fields=["status", "cancelled_at", "updated_at"])
        pk, title = rfq.pk, rfq.title
        transaction.on_commit(
            lambda: _notify_many(
                quoter_ids,
                "rfq.cancelled",
                "Request cancelled",
                f"The buyer cancelled the request {title}.",
                "/seller/rfq",
                {"rfq_id": str(pk)},
            )
        )
    return rfq


# --------------------------------------------------------------------------- buyer: attachments


def add_attachment(*, buyer, rfq_id, upload) -> RFQAttachment:
    ext = os.path.splitext(upload.name or "")[1].lower()
    if ext not in ATTACHMENT_TYPES or (upload.content_type or "").lower() != ATTACHMENT_TYPES[ext]:
        raise ApiError(400, "file_type", "Attach a PDF, PNG, JPEG or WebP file.")
    if upload.size > MAX_ATTACHMENT_BYTES:
        raise ApiError(400, "file_too_large", "Files can be at most 10 MB.")
    head = upload.read(12)
    upload.seek(0)
    if not MAGIC[ext](head):
        raise ApiError(400, "file_type", "The file contents do not match its type.")

    with transaction.atomic():
        rfq = _lock_rfq(rfq_id, buyer=buyer)
        if rfq.status not in (RFQ.STATUS_DRAFT, RFQ.STATUS_OPEN, RFQ.STATUS_QUOTING):
            raise ApiError(409, "not_editable", "This request can no longer be edited.")
        if rfq.attachments.count() >= MAX_ATTACHMENTS:
            raise ApiError(400, "too_many_attachments", f"At most {MAX_ATTACHMENTS} attachments.")
        return RFQAttachment.objects.create(
            rfq=rfq,
            file=upload,
            filename=os.path.basename(upload.name)[:255],
            content_type=ATTACHMENT_TYPES[ext],
            size=upload.size,
        )


def remove_attachment(*, buyer, rfq_id, attachment_id) -> None:
    with transaction.atomic():
        rfq = _lock_rfq(rfq_id, buyer=buyer)
        if rfq.status not in (RFQ.STATUS_DRAFT, RFQ.STATUS_OPEN, RFQ.STATUS_QUOTING):
            raise ApiError(409, "not_editable", "This request can no longer be edited.")
        attachment = rfq.attachments.filter(pk=attachment_id).first()
        if attachment is None:
            raise ApiError(404, "attachment_not_found", "Attachment not found.")
        storage, name = attachment.file.storage, attachment.file.name
        attachment.delete()
        transaction.on_commit(lambda: storage.delete(name))


# --------------------------------------------------------------------------- supplier: quotes


def _quote_values(rfq: RFQ, seller, data: dict) -> dict:
    """Server-computed quote fields: ``total_price = unit_price x rfq.quantity`` rounded once."""
    values = {}
    for field in QUOTE_FIELDS:
        if field in data:
            values[field] = data[field]
    if "unit_price" in values:
        values["unit_price"] = q2(values["unit_price"])
        values["total_price"] = q2(values["unit_price"] * rfq.quantity)
        if values["total_price"] >= MAX_TOTAL:
            raise ValidationError({"unit_price": ["This price is too large for the requested quantity."]})
    if "shipping_cost" in values:
        values["shipping_cost"] = q2(values["shipping_cost"])
    if "product_id" in data:
        product_id = data["product_id"]
        product = None
        if product_id is not None:
            product = Product.objects.filter(pk=product_id, seller_profile=seller).first()
            if product is None:
                raise ApiError(400, "product_not_found", "That product is not one of your listings.")
        values["product"] = product
    return values


def _accepting_quotes(rfq: RFQ, now) -> bool:
    return rfq.status in selectors.LIVE_STATUSES and now < rfq.closes_at


def submit_quote(*, rfq_id, seller, data: dict, idempotency_key: str):
    """Returns ``(quote, created)``; ``created`` is True only for a brand-new row.

    A replay (same key) and a resubmit of a withdrawn quote both return ``created=False``.
    """
    with transaction.atomic():
        try:
            rfq = RFQ.objects.select_for_update(of=("self",)).get(pk=rfq_id)
        except (RFQ.DoesNotExist, ValueError, TypeError):
            raise ApiError(404, "rfq_not_found", "Request not found.")
        if not RFQ.objects.filter(selectors.matching(seller), pk=rfq.pk).exists():
            raise ApiError(404, "rfq_not_found", "Request not found.")
        now = timezone.now()
        quote = Quote.objects.select_for_update().filter(rfq=rfq, supplier=seller).first()
        if quote and quote.idempotency_key == idempotency_key:
            return quote, False  # replay; a stale retry never undoes a withdrawal
        if not _accepting_quotes(rfq, now) or (
            quote and quote.status in (Quote.STATUS_ACCEPTED, Quote.STATUS_NOT_SELECTED)
        ):
            raise ApiError(409, "rfq_not_accepting_quotes", "This request is no longer accepting quotes.")
        if quote and quote.status == Quote.STATUS_SUBMITTED:
            raise ApiError(409, "quote_exists", "You have already quoted on this request.", quote_id=str(quote.id))

        values = _quote_values(rfq, seller, data)
        values.setdefault("product", None)
        created = quote is None
        if created:
            quote = Quote(rfq=rfq, supplier=seller)
        for field, value in values.items():
            setattr(quote, field, value)
        quote.quantity, quote.currency = rfq.quantity, rfq.currency
        quote.status, quote.submitted_at, quote.withdrawn_at = Quote.STATUS_SUBMITTED, now, None
        quote.idempotency_key = idempotency_key
        quote.save()

        _recount(rfq)
        if rfq.status == RFQ.STATUS_OPEN:
            rfq.status = RFQ.STATUS_QUOTING
        rfq.save(update_fields=["quote_count", "status", "updated_at"])
        buyer_id, pk, title = rfq.buyer_id, rfq.pk, rfq.title
        transaction.on_commit(
            lambda: notify(
                buyer_id,
                "rfq.quote_received",
                "New quote received",
                f"A supplier quoted on {title}.",
                f"/account/requests/{pk}",
                data={"rfq_id": str(pk)},
            )
        )
    return quote, created


def _lock_quote_with_rfq(quote_id, seller):
    """Lock the RFQ row, then the seller's quote on it. Unknown or foreign quote -> 404."""
    rfq_id = Quote.objects.filter(pk=quote_id, supplier=seller).values_list("rfq_id", flat=True).first()
    if rfq_id is None:
        raise ApiError(404, "quote_not_found", "Quote not found.")
    rfq = _lock_rfq(rfq_id)
    return rfq, Quote.objects.select_for_update().get(pk=quote_id, supplier=seller)


def edit_quote(*, quote_id, seller, data: dict) -> Quote:
    with transaction.atomic():
        rfq, quote = _lock_quote_with_rfq(quote_id, seller)
        if quote.status != Quote.STATUS_SUBMITTED or not _accepting_quotes(rfq, timezone.now()):
            raise ApiError(409, "not_editable", "This quote can no longer be edited.")
        for field, value in _quote_values(rfq, seller, data).items():
            setattr(quote, field, value)
        quote.save()
    return quote


def withdraw_quote(*, quote_id, seller) -> Quote:
    with transaction.atomic():
        rfq, quote = _lock_quote_with_rfq(quote_id, seller)
        if quote.status == Quote.STATUS_WITHDRAWN:
            return quote
        if quote.status != Quote.STATUS_SUBMITTED or rfq.status not in selectors.LIVE_STATUSES:
            raise ApiError(409, "not_withdrawable", "This quote can no longer be withdrawn.")
        quote.status, quote.withdrawn_at = Quote.STATUS_WITHDRAWN, timezone.now()
        quote.save(update_fields=["status", "withdrawn_at", "updated_at"])
        _recount(rfq)
        if rfq.status == RFQ.STATUS_QUOTING and rfq.quote_count == 0:
            rfq.status = RFQ.STATUS_OPEN
        rfq.save(update_fields=["quote_count", "status", "updated_at"])
    return quote


# --------------------------------------------------------------------------- award


def create_award_order(rfq: RFQ, quote: Quote):
    """Create the buyer's pending order for the awarded quote. **Hook for BE-ORD-1.**

    Delegates to ``apps.orders.services.create_order_for_rfq(rfq, quote) -> Order`` (plan 20
    section 2). Until that function exists this raises ``NotImplementedError``; ``award`` catches
    it and leaves ``rfq.order`` empty so the sweeper retries after BE-ORD-1 lands.

    Contract BE-ORD-1 must satisfy:
      * Called inside the award transaction with the RFQ row locked; ``rfq.awarded_at`` is set.
      * Must NOT touch stock. Idempotent on ``UniqueConstraint(source, source_id)``: if an order
        for ``source="rfq", source_id=rfq.id`` exists, return it unchanged.
      * Order: ``source="rfq"``, ``source_id=rfq.id``, ``user=rfq.buyer``, ``seller=quote.supplier``,
        ``currency``, ``subtotal=quote.total_price``, ``shipping_cost=quote.shipping_cost``,
        ``total_amount=subtotal+shipping``, ``order_status="Pending"``, ``payment_status="unpaid"``,
        ``payment_due_at=rfq.awarded_at + constants.PAYMENT_WINDOW``, ``delivery_method="quote"``,
        ``pay_mode="Online"``; one OrderItem (title=rfq.title, product=quote.product,
        quantity=quote.quantity, unit_price=quote.unit_price, total_price=quote.total_price).
    """
    try:
        from apps.orders import services as orders_services

        create = orders_services.create_order_for_rfq
    except (ImportError, AttributeError):
        raise NotImplementedError(
            "BE-ORD-1: apps.orders.services.create_order_for_rfq is not implemented yet"
        )
    return create(rfq, quote)


def _attempt_order(rfq: RFQ, quote: Quote):
    """Run the order hook in a savepoint. Returns the order, or None while the hook is missing."""
    try:
        with transaction.atomic():
            return create_award_order(rfq, quote)
    except NotImplementedError:
        logger.warning("order for rfq %s deferred: orders hook not implemented", rfq.pk)
        return None


def award(*, rfq_id, buyer, quote_id, idempotency_key: str) -> RFQ:
    """R8. quoting -> awarded in one transaction: order, accepted quote, the rest not_selected.

    An RFQ awards at most once: the row lock serializes concurrent awards and
    ``uniq_rfq_one_accepted_quote`` / ``uniq_rfq_order`` back it up in the database.
    """
    with transaction.atomic():
        rfq = _lock_rfq(rfq_id, buyer=buyer)
        if rfq.awarded_quote_id:
            if rfq.awarded_quote_id == quote_id:
                return rfq  # replay
            raise ApiError(409, "already_awarded", "This request has already been awarded.")
        if rfq.status != RFQ.STATUS_QUOTING:
            raise ApiError(409, "rfq_not_awardable", "This request cannot be awarded right now.")
        now = timezone.now()
        if now > rfq.closes_at + AWARD_GRACE:
            raise ApiError(409, "award_window_closed", "The award window for this request has closed.")
        try:
            quote = Quote.objects.select_for_update().select_related("supplier").get(pk=quote_id, rfq=rfq)
        except Quote.DoesNotExist:
            raise ApiError(404, "quote_not_found", "Quote not found.")
        if quote.status != Quote.STATUS_SUBMITTED:
            raise ApiError(409, "quote_not_available", "This quote is no longer available.")
        if quote.valid_until and quote.valid_until < now:
            raise ApiError(409, "quote_expired", "This quote has expired.")

        rfq.status, rfq.awarded_quote, rfq.awarded_at = RFQ.STATUS_AWARDED, quote, now
        rfq.award_idempotency_key = idempotency_key
        rfq.order = _attempt_order(rfq, quote)
        quote.status = Quote.STATUS_ACCEPTED
        quote.save(update_fields=["status", "updated_at"])
        loser_ids = _release_quotes(rfq, now)
        rfq.save()

        pk, title, winner_id = rfq.pk, rfq.title, quote.supplier.user_id
        data = {"rfq_id": str(pk), "order_id": str(rfq.order_id) if rfq.order_id else None}

        def _after_award():
            notify(winner_id, "rfq.awarded", "Your quote was accepted",
                   f"The buyer accepted your quote for {title}.", "/seller/rfq", data=data)
            _notify_many(loser_ids, "rfq.not_selected", "Request awarded to another supplier",
                         f"{title} was awarded to another supplier.", "/seller/rfq", data)

        transaction.on_commit(_after_award)
    return rfq


# --------------------------------------------------------------------------- sweeper


def sweep_rfq(rfq_id) -> str:
    """Apply the one time-driven transition due for this RFQ, if any.

    Returns ``expired | closed | order_created | noop | missing``. Locks the RFQ first and
    re-checks the state, so running twice (or racing a buyer action) is harmless.
    """
    with transaction.atomic():
        try:
            rfq = RFQ.objects.select_for_update(of=("self",)).get(pk=rfq_id)
        except RFQ.DoesNotExist:
            return "missing"
        now = timezone.now()
        pk, title, buyer_id = rfq.pk, rfq.title, rfq.buyer_id
        data = {"rfq_id": str(pk)}

        if rfq.status == RFQ.STATUS_OPEN and rfq.closes_at <= now:
            rfq.status = RFQ.STATUS_EXPIRED
            rfq.save(update_fields=["status", "updated_at"])
            transaction.on_commit(
                lambda: notify(buyer_id, "rfq.expired", "Request expired",
                               f"{title} closed without any quotes.", f"/account/requests/{pk}", data=data)
            )
            return "expired"

        if rfq.status == RFQ.STATUS_QUOTING and rfq.closes_at + AWARD_GRACE <= now:
            quoter_ids = _release_quotes(rfq, now)
            rfq.status = RFQ.STATUS_EXPIRED
            rfq.save(update_fields=["status", "updated_at"])

            def _after_expiry():
                notify(buyer_id, "rfq.expired", "Request expired",
                       f"{title} expired before you chose a quote.", f"/account/requests/{pk}", data=data)
                _notify_many(quoter_ids, "rfq.expired", "Request expired",
                             f"{title} expired without an award.", "/seller/rfq", data)

            transaction.on_commit(_after_expiry)
            return "expired"

        if rfq.status == RFQ.STATUS_AWARDED:
            quote = Quote.objects.select_related("supplier").get(pk=rfq.awarded_quote_id)
            if rfq.order_id is None:
                rfq.order = _attempt_order(rfq, quote)
                if rfq.order is None:
                    return "noop"
                rfq.save(update_fields=["order", "updated_at"])
                return "order_created"
            order = rfq.order
            if order.payment_status == "paid":
                rfq.status, rfq.closed_at = RFQ.STATUS_CLOSED, now
                rfq.save(update_fields=["status", "closed_at", "updated_at"])
                return "closed"
            if order.order_status == "Cancelled":
                rfq.status = RFQ.STATUS_EXPIRED
                rfq.save(update_fields=["status", "updated_at"])
                supplier_id = quote.supplier.user_id
                transaction.on_commit(
                    lambda: notify(supplier_id, "rfq.order_lapsed", "Order was not paid",
                                   f"The buyer did not pay for {title} in time.", "/seller/rfq", data=data)
                )
                return "expired"
    return "noop"


def sweep() -> dict:
    """Beat, every 300s: run ``sweep_rfq`` for every RFQ with a time-driven transition pending."""
    now = timezone.now()
    due = (
        list(
            RFQ.objects.filter(status=RFQ.STATUS_OPEN, closes_at__lte=now)
            .order_by("closes_at")
            .values_list("id", flat=True)[:SWEEP_BATCH]
        )
        + list(
            RFQ.objects.filter(status=RFQ.STATUS_QUOTING, closes_at__lte=now - AWARD_GRACE)
            .order_by("closes_at")
            .values_list("id", flat=True)[:SWEEP_BATCH]
        )
        + list(
            RFQ.objects.filter(status=RFQ.STATUS_AWARDED)
            .order_by("awarded_at")
            .values_list("id", flat=True)[:SWEEP_BATCH]
        )
    )
    outcomes = Counter()
    for rfq_id in due:
        try:
            outcomes[sweep_rfq(rfq_id)] += 1
        except Exception:
            logger.exception("sweeper failed for rfq %s", rfq_id)
            outcomes["error"] += 1
    return dict(outcomes)
