"""Payment lifecycle for checkout sessions and the admin payment ledger.

Everything that changes money state goes through here, under row locks, and is idempotent:

  * ``mark_session_paid``      - the ONE function the webhook and the buyer's polling both call.
  * ``reconcile_or_expire``    - unpaid sessions past their window: ask Paystack first, then cancel + release stock.
  * ``record_manual_payment``  - an admin records money received outside the gateway (cash, bank transfer...).
  * ``mark_cod_collected``     - the seller confirmed cash was collected on delivery.

Rules that matter:
  * A session is only marked paid when the gateway's amount AND currency match what we asked for. Anything
    else becomes ``needs_review`` and the orders are left untouched for an admin to resolve.
  * A late payment (after the session expired or was cancelled) is never silently accepted: ``needs_review``.
  * Locks are always taken session -> orders (sorted by id), so concurrent webhook / poll / expiry cannot deadlock.
"""

import logging
from datetime import timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import F, Sum
from django.utils import timezone

from apps.payments import paystack
from apps.products.models import ProductVariant

from .models import CheckoutSession, Order, OrderItem, OrderPayment, OrderRefund
from .services import OrderApiError, money

logger = logging.getLogger("tradehut.payments")

MANUAL_METHODS = ("cash", "bank_transfer", "mobile_money", "card", "other")
REFERENCE_REQUIRED = ("bank_transfer", "mobile_money", "card")
CHANNEL_TO_METHOD = {
    "card": "card",
    "mobile_money": "mobile_money",
    "bank_transfer": "bank_transfer",
    "bank": "bank_transfer",
    "eft": "bank_transfer",
}
CLOSED_ORDER_STATUSES = ("Cancelled", "Refunded")


# --------------------------------------------------------------------------- helpers


def paid_total(order) -> Decimal:
    total = OrderPayment.objects.filter(order=order, status="succeeded").aggregate(s=Sum("amount"))["s"]
    return money(total or 0)


def outstanding(order) -> Decimal:
    return max(money(order.total_amount) - paid_total(order), Decimal("0.00"))


def _settle_order(order, now) -> None:
    """Flip the order to paid once succeeded payments cover its total. Caller holds the order lock."""
    if order.payment_status == "unpaid" and paid_total(order) >= money(order.total_amount):
        order.payment_status = "paid"
        order.paid_at = order.paid_at or now
        if order.order_status == "Pending":
            order.order_status = "Processing"
        order.save(update_fields=["payment_status", "paid_at", "order_status", "updated_at"])
        # Paid in full by other means: the "cash expected on delivery" row would otherwise sit there forever.
        OrderPayment.objects.filter(order=order, provider="cod", status="pending").update(
            status="failed", note="Settled by other payments"
        )


def _record_unreconciled_payment(session, safe, got_minor, got_currency, problem, now) -> None:
    """Money the gateway took that we could not safely match to the orders (late, or the wrong amount).

    It goes into the ledger as ``needs_review`` with the amount the GATEWAY reports, so an admin sees it, and can
    refund it or cancel the orders. Without this the charge would exist only in Paystack's dashboard.
    """
    amount = money(Decimal(got_minor) / 100) if got_minor is not None else money(session.amount)
    values = {
        "status": "needs_review",
        "method": CHANNEL_TO_METHOD.get(str(safe.get("channel") or "").lower(), "other"),
        "amount": amount,
        "currency": got_currency or session.currency,
        "paid_at": now,
        "note": f"Needs review: {problem}"[:500],
        "provider_payload": safe,
    }
    row = OrderPayment.objects.filter(session=session).order_by("pk").first()
    if row is not None:
        for field, value in values.items():
            setattr(row, field, value)
        row.save(update_fields=[*values, "updated_at"])
        return
    first_order = session.orders.order_by("pk").first()
    if first_order is not None:
        OrderPayment.objects.create(
            order=first_order, session=session, provider="paystack", reference=session.reference or "", **values
        )


def _lock_orders(session) -> list:
    ids = list(session.orders.values_list("pk", flat=True))
    return list(Order.objects.select_for_update().filter(pk__in=ids).order_by("pk"))


def create_pending_payments(session, orders, *, provider, method="") -> None:
    """One 'pending' ledger row per order, so admins see expected money before it arrives."""
    OrderPayment.objects.bulk_create(
        [
            OrderPayment(
                order=order,
                session=session,
                provider=provider,
                method=method,
                status="pending",
                amount=order.total_amount,
                currency=session.currency,
                reference=session.reference or "",
            )
            for order in orders
        ]
    )


def _restore_stock(order) -> None:
    """Give the reserved stock back. Variants are locked in a fixed order so concurrent actions cannot deadlock."""
    lines = list(OrderItem.objects.filter(order=order, variant__isnull=False).values("variant_id", "quantity"))
    if not lines:
        return
    list(
        ProductVariant.objects.select_for_update()
        .filter(pk__in={ln["variant_id"] for ln in lines})
        .order_by("pk")
        .values_list("pk", flat=True)
    )
    for ln in lines:
        ProductVariant.objects.filter(pk=ln["variant_id"]).update(quantity=F("quantity") + ln["quantity"])


def _cancel_unpaid_orders(session, orders) -> None:
    """Cancel never-paid orders and give their reserved stock back. Paid/shipped orders are never touched."""
    for order in orders:
        if order.order_status == "Pending" and order.payment_status == "unpaid":
            _restore_stock(order)
            order.order_status = "Cancelled"
            order.save(update_fields=["order_status", "updated_at"])
    OrderPayment.objects.filter(session=session, status="pending").update(status="failed")


# ------------------------------------------------------------------ online payments


def mark_session_paid(session_id, data: dict, *, now=None) -> str:
    """Settle a Paystack session from gateway data (webhook body or a verify() result). Idempotent.

    Returns the session's resulting status: ``paid``, ``needs_review`` or whatever it already was.
    """
    now = now or timezone.now()
    with transaction.atomic():
        session = CheckoutSession.objects.select_for_update().get(pk=session_id)
        if session.provider != "paystack" or session.status == "paid":
            return session.status

        safe = paystack.safe_payload(data)
        # `requested_amount` is what we asked for; `amount` can include fees when the customer bears them.
        try:
            got_minor = int(data.get("requested_amount", data.get("amount")))
        except (TypeError, ValueError):
            got_minor = None
        expected_minor = int((money(session.amount) * 100).to_integral_value())
        got_currency = str(data.get("currency") or "").upper()

        problem = None
        if session.status in ("expired", "failed", "needs_review"):
            problem = f"payment arrived while the session was {session.status}"
        elif got_minor != expected_minor or got_currency != session.currency:
            problem = f"amount/currency mismatch (expected {expected_minor} {session.currency}, got {got_minor} {got_currency})"

        orders = [] if problem else _lock_orders(session)
        if not problem and any(o.order_status != "Pending" or o.payment_status != "unpaid" for o in orders):
            problem = "an order in this checkout is no longer awaiting payment"

        if problem:
            session.status = "needs_review"
            session.provider_payload = safe
            session.save(update_fields=["status", "provider_payload", "updated_at"])
            _record_unreconciled_payment(session, safe, got_minor, got_currency, problem, now)
            logger.warning("Checkout %s needs review: %s", session.reference, problem)
            return "needs_review"

        method = CHANNEL_TO_METHOD.get(str(data.get("channel") or "").lower(), "other")
        for order in orders:
            OrderPayment.objects.update_or_create(
                provider="paystack",
                reference=session.reference,
                order=order,
                defaults={
                    "session": session,
                    "method": method,
                    "status": "succeeded",
                    "amount": order.total_amount,
                    "currency": session.currency,
                    "paid_at": now,
                    "provider_payload": safe,
                },
            )
            _settle_order(order, now)

        session.status = "paid"
        session.paid_at = now
        session.provider_payload = safe
        session.save(update_fields=["status", "paid_at", "provider_payload", "updated_at"])
        logger.info("Checkout %s paid (%s %s)", session.reference, session.amount, session.currency)
        return "paid"


def _expire(session_id) -> bool:
    with transaction.atomic():
        session = CheckoutSession.objects.select_for_update().get(pk=session_id)
        if session.status != "pending":
            return False
        _cancel_unpaid_orders(session, _lock_orders(session))
        session.status = "expired"
        session.save(update_fields=["status", "updated_at"])
        return True


IN_FLIGHT = ("ongoing", "pending", "processing", "queued")  # the buyer may still be approving (e.g. a MoMo prompt)
GIVE_UP_AFTER = timedelta(hours=24)  # an in-flight payment is waited for this long past the window, then released


def reconcile_or_expire(session, *, now=None) -> str:
    """For a session past its window: if Paystack says it was paid (missed webhook) settle it, else expire it.

    * Paystack says success                       -> settle it.
    * Paystack has never heard of the reference   -> the payment page was never opened: expire (stock back).
    * Still in flight (e.g. a MoMo approval)      -> leave it; it is released only 24h after the window.
    * Paystack unreachable / 5xx                  -> leave it, so a paid order is never cancelled blind.
    """
    now = now or timezone.now()
    try:
        data = paystack.verify(session.reference)
    except paystack.PaystackError as exc:
        if exc.not_found:
            return "expired" if _expire(session.pk) else "unchanged"
        logger.warning("Could not verify %s before expiring: %s", session.reference, exc)
        return "skipped"
    status = str(data.get("status") or "").lower()
    if status == "success":
        return mark_session_paid(session.pk, data, now=now)
    if status in IN_FLIGHT and session.expires_at and now - session.expires_at < GIVE_UP_AFTER:
        return "skipped"
    return "expired" if _expire(session.pk) else "unchanged"


def expire_stale_sessions(*, now=None, limit=200) -> dict:
    """Run from Celery beat (every 2 minutes) or ``manage.py expire_checkout_sessions``: handle every unpaid
    session past ``expires_at``. One failing session never stops the others (it is logged and retried next run)."""
    now = now or timezone.now()
    counts = {"expired": 0, "paid": 0, "skipped": 0, "unchanged": 0, "needs_review": 0, "errors": 0}
    stale = CheckoutSession.objects.filter(provider="paystack", status="pending", expires_at__lt=now).order_by("expires_at")
    for session in stale[:limit]:
        try:
            outcome = reconcile_or_expire(session, now=now)
        except Exception:  # noqa: BLE001 - isolate each session
            logger.exception("Expiring checkout session %s failed", session.pk)
            counts["errors"] += 1
            continue
        counts[outcome if outcome in counts else "unchanged"] += 1
    return counts


def window() -> timedelta:
    from django.conf import settings

    return timedelta(minutes=int(getattr(settings, "CHECKOUT_PAYMENT_WINDOW_MINUTES", 30) or 30))


# ------------------------------------------------------------------- cash on delivery


def mark_cod_collected(order, now) -> None:
    """Seller / admin confirmed the cash was collected. Caller holds the order lock. Idempotent.

    Only what is still OWED counts: an admin may already have recorded part of it by hand, and the cash
    collected at the door then covers just the rest (never the whole total on top of what was recorded).
    """
    owed = outstanding(order)
    payment = OrderPayment.objects.filter(order=order, provider="cod").first()
    if owed <= 0:
        if payment is not None and payment.status == "pending":
            payment.status = "failed"
            payment.note = "Settled by other payments"
            payment.save(update_fields=["status", "note", "updated_at"])
        return
    if payment is None:
        OrderPayment.objects.create(
            order=order,
            provider="cod",
            method="cash",
            status="succeeded",
            amount=owed,
            currency=_currency(),
            paid_at=now,
        )
    elif payment.status != "succeeded":
        payment.status = "succeeded"
        payment.method = payment.method or "cash"
        payment.amount = owed
        payment.paid_at = now
        payment.save(update_fields=["status", "method", "amount", "paid_at", "updated_at"])


def _currency() -> str:
    from apps.core.currency import get_store_base_currency

    return get_store_base_currency()


# --------------------------------------------------------------------- admin payments


def record_manual_payment(admin, *, order_id, amount, method, reference, note, key, now=None):
    """An admin records money received outside the gateway. Returns ``(payment, created)``.

    Replaying the same ``Idempotency-Key`` returns the original row. The amount can never exceed what is
    still owed, and an order whose online payment is still open cannot be paid by hand (it could be paid twice).
    """
    now = now or timezone.now()
    if method not in MANUAL_METHODS:
        raise OrderApiError(400, "invalid_method", f"method must be one of: {', '.join(MANUAL_METHODS)}.")
    reference = (reference or "").strip()
    if method in REFERENCE_REQUIRED and not reference:
        raise OrderApiError(400, "reference_required", "A transaction reference is required for this payment method.")
    amount = money(amount)
    if amount <= 0:
        raise OrderApiError(400, "invalid_amount", "Amount must be greater than zero.")

    with transaction.atomic():
        order = Order.objects.select_for_update().filter(pk=order_id).first()
        if order is None:
            raise OrderApiError(404, "order_not_found", "Order not found.")
        # Checked UNDER the order lock: two concurrent requests with the same key cannot both get past this.
        existing = OrderPayment.objects.filter(recorded_by=admin, idempotency_key=key).first()
        if existing:
            return existing, False
        if order.order_status in CLOSED_ORDER_STATUSES:
            raise OrderApiError(409, "order_closed", f"This order is {order.order_status.lower()}; payments can't be added.")
        if CheckoutSession.objects.filter(orders=order, provider="paystack", status="pending").exists():
            raise OrderApiError(
                409, "awaiting_online_payment", "This order is waiting for an online payment; wait for it to finish or expire."
            )
        owed = outstanding(order)
        if amount > owed:
            raise OrderApiError(409, "overpayment", f"Only {owed} is still owed on this order.", outstanding=str(owed))

        try:
            with transaction.atomic():  # a savepoint, so a clash is an answer and not a poisoned transaction
                payment = OrderPayment.objects.create(
                    order=order,
                    provider="manual",
                    method=method,
                    status="succeeded",
                    amount=amount,
                    currency=_currency(),
                    reference=reference,
                    paid_at=now,
                    recorded_by=admin,
                    note=(note or "").strip()[:500],
                    idempotency_key=key,
                )
        except IntegrityError:
            raise OrderApiError(
                409, "duplicate_reference", "A payment with that reference is already recorded on this order."
            )
        _settle_order(order, now)
        logger.info("Admin %s recorded %s %s on order %s (%s)", admin.pk, amount, method, order.pk, reference or "no ref")
        return payment, True


# ------------------------------------------------------------------------- refunds
#
# Money going BACK to a customer. Rules:
#   * A refund reserves its amount the moment it is requested (pending counts), so a double click, a retry, or two
#     admins at once can never refund more than was paid. A failed refund releases its amount again.
#   * Through the gateway the API call only QUEUES the refund; it counts as returned (and the order changes) only
#     when Paystack's ``refund.processed`` arrives. Paystack has no idempotency for refunds, so the reservation
#     under the payment row lock is what prevents a duplicate request.
#   * A gateway answer of "no" (4xx) frees the amount at once. A timeout / network error is an UNKNOWN outcome:
#     the refund stays pending and reserved until the webhook (or an admin who checked the dashboard) settles it.
#   * A full refund marks the order Refunded; if the goods never shipped (Pending / Processing) the stock goes back.

REFUND_WINDOW_DAYS = 180  # Paystack only refunds successful transactions up to 180 days old
RESERVING = ("pending", "succeeded")


def _minor(amount) -> int:
    return paystack.to_minor(amount)


def refunded_amount(payment, statuses=("succeeded",)) -> Decimal:
    total = OrderRefund.objects.filter(payment=payment, status__in=statuses).aggregate(s=Sum("amount"))["s"]
    return money(total or 0)


def refundable_amount(payment) -> Decimal:
    """What can still be refunded on ``payment`` (pending refunds are reserved)."""
    if payment.status not in ("succeeded", "refunded", "needs_review"):
        return Decimal("0.00")
    return max(money(payment.amount) - refunded_amount(payment, RESERVING), Decimal("0.00"))


def _apply_refund_effects(order, payment, now) -> None:
    """After a refund SUCCEEDS: update the payment, then the order. Caller holds both row locks."""
    was_unreconciled = payment.status == "needs_review"
    if payment.status in ("succeeded", "needs_review") and refunded_amount(payment) >= money(payment.amount):
        payment.status = "refunded"
        payment.save(update_fields=["status", "updated_at"])
    if was_unreconciled:
        return  # that money never settled this order (late / mismatched), so refunding it changes nothing about the order

    total_received = OrderPayment.objects.filter(order=order, status__in=("succeeded", "refunded")).aggregate(s=Sum("amount"))["s"]
    total_refunded = OrderRefund.objects.filter(order=order, status="succeeded").aggregate(s=Sum("amount"))["s"]
    if money(total_refunded or 0) >= money(total_received or 0) > 0:
        order.payment_status = "refunded"
        if order.order_status not in ("Refunded", "Cancelled"):
            if order.order_status in ("Pending", "Processing"):
                _restore_stock(order)  # the goods never left
            order.order_status = "Refunded"
    else:
        order.payment_status = "partially_refunded"
    order.save(update_fields=["payment_status", "order_status", "updated_at"])


def request_refund(admin, *, payment_id, amount, reason, mode, key, now=None):
    """Create a refund. Returns ``(refund, created)``; ``mode`` is ``gateway`` or ``manual``.

    ``manual`` = the money was (or is being) paid back outside the gateway; it succeeds immediately.
    ``gateway`` = Paystack is asked to send it back; the result is a *pending* refund, submitted by
    ``submit_refund_to_gateway`` after this transaction commits.
    """
    now = now or timezone.now()
    reason = (reason or "").strip()
    if len(reason) < 3:
        raise OrderApiError(400, "reason_required", "Say why the refund is being made (at least 3 characters).")
    if mode not in ("gateway", "manual"):
        raise OrderApiError(400, "invalid_mode", "mode must be 'gateway' or 'manual'.")
    amount = money(amount)
    if amount <= 0:
        raise OrderApiError(400, "invalid_amount", "Amount must be greater than zero.")

    with transaction.atomic():
        payment = OrderPayment.objects.select_for_update().filter(pk=payment_id).first()
        if payment is None:
            raise OrderApiError(404, "payment_not_found", "Payment not found.")
        # Checked UNDER the payment lock: two concurrent requests with the same key cannot both get past this.
        existing = OrderRefund.objects.filter(requested_by=admin, idempotency_key=key).first()
        if existing:
            return existing, False
        if payment.status not in ("succeeded", "refunded", "needs_review"):
            raise OrderApiError(409, "payment_not_refundable", "Only a payment that was received can be refunded.")
        owed = refundable_amount(payment)
        if amount > owed:
            raise OrderApiError(409, "over_refund", f"Only {owed} can still be refunded on this payment.", refundable=str(owed))

        if mode == "gateway":
            if payment.provider != "paystack" or not payment.reference:
                raise OrderApiError(
                    409,
                    "gateway_refund_unavailable",
                    "This payment wasn't taken through the payment gateway. Pay the customer back yourself, then record it as a manual refund.",
                )
            if not paystack.is_configured():
                raise OrderApiError(409, "gateway_refund_unavailable", "The payment gateway isn't configured.")
            if now - (payment.paid_at or payment.recorded_at) > timedelta(days=REFUND_WINDOW_DAYS):
                raise OrderApiError(
                    409,
                    "refund_window_closed",
                    f"The gateway only refunds payments up to {REFUND_WINDOW_DAYS} days old. Pay the customer back yourself, then record it as a manual refund.",
                )

        order = Order.objects.select_for_update().get(pk=payment.order_id)
        refund = OrderRefund.objects.create(
            payment=payment,
            order=order,
            provider="paystack" if mode == "gateway" else "manual",
            status="pending" if mode == "gateway" else "succeeded",
            amount=amount,
            currency=payment.currency,
            reason=reason[:500],
            requested_by=admin,
            idempotency_key=key,
            processed_at=None if mode == "gateway" else now,
        )
        if mode == "manual":
            _apply_refund_effects(order, payment, now)
        logger.info("Admin %s requested a %s refund of %s on payment %s", admin.pk, mode, amount, payment.pk)
        return refund, True


def plan_cancel(order, *, now=None, lock=False) -> list:
    """Everything that must hold for an order to be cancelled; returns ``[(payment, owed)]`` to refund.

    Raises ``OrderApiError`` (with a ``code`` and a message safe to show) when it cannot be cancelled. The real
    cancel (``lock=True``, inside a transaction) and the "can I cancel this?" check the Admin page asks for
    (``lock=False``) use this one function, so a button can never promise what the action then refuses.

    * never paid (COD / abandoned)      -> nothing to refund.
    * paid through the gateway          -> its payments, to be refunded in full.
    * paid in cash / by bank (manual)   -> refused: that money has to be paid back by hand first
                                           (Payments -> open the payment -> Refund -> "I paid it back myself").
    """
    now = now or timezone.now()
    if order.order_status not in ("Pending", "Processing"):
        raise OrderApiError(
            409, "not_cancellable", "Only orders that have not shipped can be cancelled.", order_status=order.order_status
        )
    if CheckoutSession.objects.filter(orders=order, provider="paystack", status="pending").exists():
        raise OrderApiError(409, "awaiting_online_payment", "The buyer is paying online right now. Wait for it to finish or expire.")
    if OrderRefund.objects.filter(order=order, status="pending").exists():
        raise OrderApiError(409, "refund_in_progress", "A refund is already in progress on this order.")

    qs = OrderPayment.objects.filter(order=order, status="succeeded").order_by("pk")
    payments = list(qs.select_for_update() if lock else qs)
    to_refund = []
    for payment in payments:
        owed = refundable_amount(payment)
        if owed <= 0:
            continue
        if payment.provider != "paystack" or not payment.reference:
            raise OrderApiError(
                409,
                "needs_manual_refund",
                "Part of this order was paid in cash or by bank, outside the payment gateway. Pay that money back first "
                "(Payments, open the payment, Refund), then the order can be cancelled.",
            )
        if not paystack.is_configured():
            raise OrderApiError(409, "gateway_refund_unavailable", "The payment gateway isn't configured, so the refund can't be sent.")
        if now - (payment.paid_at or payment.recorded_at) > timedelta(days=REFUND_WINDOW_DAYS):
            raise OrderApiError(
                409,
                "refund_window_closed",
                f"The gateway only refunds payments up to {REFUND_WINDOW_DAYS} days old. Pay the customer back yourself, then record it as a manual refund.",
            )
        to_refund.append((payment, owed))
    if not payments and order.payment_status in ("paid", "partially_refunded"):
        raise OrderApiError(
            409,
            "needs_manual_refund",
            "This order is marked as paid but has no payment on record, so there is nothing to refund automatically. "
            "Record the payment and refund it from the Payments page, or pay the customer back directly.",
        )
    return to_refund


def cancel_blocker(order, *, now=None):
    """``(blocker, will_refund)`` for the Admin page: ``blocker`` is ``None`` when the order can be cancelled now,
    else ``{"code", "message"}``; ``will_refund`` says whether cancelling returns money to the buyer."""
    try:
        to_refund = plan_cancel(order, now=now)
    except OrderApiError as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        return {"code": detail.get("code", "not_cancellable"), "message": detail.get("detail", "This order can't be cancelled.")}, False
    return None, bool(to_refund)


def cancel_order_and_refund(order, *, actor, reason, now=None) -> list:
    """Cancel an order that has not shipped, give its stock back and reserve a full refund of what was paid.

    Caller holds the order row lock inside ``transaction.atomic`` and, AFTER the commit, passes the returned ids
    to ``submit_pending_refunds`` (the gateway is never called while a database lock is held). The rules live in
    ``plan_cancel``.
    """
    now = now or timezone.now()
    reason = (reason or "").strip()
    to_refund = plan_cancel(order, now=now, lock=True)

    # Stock is only reserved by checkout (those orders carry the checkout key); older orders never reserved any.
    if order.checkout_key:
        _restore_stock(order)
    order.order_status = "Cancelled"
    order.cancelled_at = now
    order.cancel_reason = reason[:500]
    order.save(update_fields=["order_status", "cancelled_at", "cancel_reason", "updated_at"])
    OrderPayment.objects.filter(order=order, status="pending").update(status="failed")

    refund_ids = []
    for payment, owed in to_refund:
        refund = OrderRefund.objects.create(
            payment=payment,
            order=order,
            provider="paystack",
            status="pending",
            amount=owed,
            currency=payment.currency,
            reason=f"Order cancelled: {reason}"[:500] if reason else "Order cancelled",
            requested_by=actor if getattr(actor, "pk", None) else None,
        )
        refund_ids.append(refund.pk)
    return refund_ids


def submit_pending_refunds(refund_ids) -> list:
    """Send refunds created by ``cancel_order_and_refund`` to the gateway. Never raises: the cancellation already
    happened, so a gateway problem is recorded on the refund (visible on the payment page) instead."""
    outcomes = []
    for refund_id in refund_ids:
        try:
            refund = submit_refund_to_gateway(refund_id)
            outcomes.append((refund_id, refund.status))
        except OrderApiError as exc:
            logger.warning("Refund %s was not sent to the gateway: %s", refund_id, exc.detail)
            outcomes.append((refund_id, "error"))
    return outcomes


def submit_refund_to_gateway(refund_id, *, now=None) -> OrderRefund:
    """Send a pending gateway refund to Paystack (call after ``request_refund`` committed).

    Raises ``OrderApiError`` 502 if the gateway refused (the refund is marked failed, amount released) or could
    not be confirmed (the refund stays pending and reserved; see the module notes above).
    """
    refund = OrderRefund.objects.select_related("payment").get(pk=refund_id)
    try:
        data = paystack.create_refund(
            reference=refund.payment.reference,
            amount_minor=_minor(refund.amount),
            currency=refund.currency,
            merchant_note=refund.reason,
        )
    except paystack.PaystackError as exc:
        if exc.refused:
            mark_refund_failed(refund.pk, note=str(exc)[:480], now=now)
            raise OrderApiError(502, "gateway_refused", f"The payment gateway refused the refund. {exc}") from exc
        OrderRefund.objects.filter(pk=refund.pk).update(
            failure_note="The gateway did not confirm the request. Check the payment gateway dashboard before trying again."
        )
        logger.warning("Refund %s: gateway outcome unknown (%s)", refund.pk, exc)
        raise OrderApiError(
            502,
            "gateway_unconfirmed",
            "We couldn't confirm the refund with the payment gateway. It is held as pending: check the gateway dashboard before trying again.",
        ) from exc

    OrderRefund.objects.filter(pk=refund.pk).update(
        provider_refund_id=str(data.get("id") or ""), provider_payload=paystack.safe_refund_payload(data)
    )
    refund.refresh_from_db()
    if str(data.get("status") or "").lower() == "processed":
        finalize_refund_success(refund.pk, payload=paystack.safe_refund_payload(data), now=now)
        refund.refresh_from_db()
    return refund


def finalize_refund_success(refund_id, *, payload=None, now=None) -> str:
    """The gateway confirmed the money went back. Idempotent; also recovers a refund we had marked failed."""
    now = now or timezone.now()
    with transaction.atomic():
        refund = OrderRefund.objects.select_for_update().get(pk=refund_id)
        if refund.status == "succeeded":
            return "succeeded"
        payment = OrderPayment.objects.select_for_update().get(pk=refund.payment_id)
        order = Order.objects.select_for_update().get(pk=refund.order_id)
        if refund.status == "failed":
            logger.error("Refund %s was marked failed but the gateway reports it processed; recording the truth", refund.pk)
        refund.status = "succeeded"
        refund.processed_at = now
        refund.failure_note = ""
        if payload:
            refund.provider_payload = payload
        refund.save(update_fields=["status", "processed_at", "failure_note", "provider_payload", "updated_at"])
        _apply_refund_effects(order, payment, now)
        return "succeeded"


def mark_refund_failed(refund_id, *, note, now=None) -> bool:
    """A pending refund did not go through: release its amount. Only pending refunds can fail."""
    with transaction.atomic():
        refund = OrderRefund.objects.select_for_update().get(pk=refund_id)
        if refund.status != "pending":
            return False
        refund.status = "failed"
        refund.failure_note = (note or "")[:500]
        refund.processed_at = now or timezone.now()
        refund.save(update_fields=["status", "failure_note", "processed_at", "updated_at"])
        return True


def _match_refund(data: dict):
    """Find our refund for a Paystack refund event. Prefer the gateway's refund id; fall back to the original
    transaction reference when exactly one pending refund is open on it (the payload shape is not guaranteed)."""
    refund_id = str(data.get("id") or "")
    if refund_id:
        found = OrderRefund.objects.filter(provider="paystack", provider_refund_id=refund_id).first()
        if found:
            return found
    transaction_data = data.get("transaction") if isinstance(data.get("transaction"), dict) else {}
    reference = str(transaction_data.get("reference") or data.get("transaction_reference") or "")
    if not reference:
        return None
    candidates = list(OrderRefund.objects.filter(provider="paystack", status="pending", payment__reference=reference)[:5])
    if len(candidates) == 1:
        return candidates[0]
    deducted = data.get("deducted_amount")
    if isinstance(deducted, int) and candidates:
        by_amount = [c for c in candidates if _minor(c.amount) == deducted]
        if len(by_amount) == 1:
            return by_amount[0]
    return None


def process_refund_event(event_name: str, data: dict, *, now=None) -> str:
    """Handle ``refund.processed`` / ``refund.failed``. Returns what happened (for tests and logs)."""
    status = str(data.get("status") or "").lower()
    if event_name == "refund.processed" or status == "processed":
        outcome = "succeeded"
    elif event_name == "refund.failed" or status == "failed":
        outcome = "failed"
    else:
        return "ignored"  # pending / processing: the money has not moved yet
    refund = _match_refund(data)
    if refund is None:
        logger.warning("Refund event %s matched no refund of ours (id=%s)", event_name, str(data.get("id"))[:20])
        return "unmatched"
    if outcome == "succeeded":
        return finalize_refund_success(refund.pk, payload=paystack.safe_refund_payload(data), now=now)
    changed = mark_refund_failed(refund.pk, note="The payment gateway reported that the refund failed.", now=now)
    return "failed" if changed else "unchanged"
