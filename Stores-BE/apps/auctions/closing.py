"""Auction closing (plan 10 section 6). Idempotent; every entry point locks the auction row first."""

import logging

from django.db import transaction
from django.utils import timezone

from . import services
from .constants import ETA_ARM_WINDOW, PAYMENT_WINDOW, SETTLE_BATCH, SWEEP_BATCH
from .models import Auction, Bid

logger = logging.getLogger(__name__)


def _attempt_winner_order(a: Auction) -> None:
    """Try to create the winner order; on failure leave ``settlement_status='pending_order'``.

    Runs in a savepoint so a failing orders call cannot poison the close transaction.
    """
    if a.order_id:
        a.settlement_status = Auction.SETTLEMENT_ORDER_CREATED
        return
    a.settlement_status = Auction.SETTLEMENT_PENDING_ORDER
    try:
        with transaction.atomic():
            order = services.create_winner_order(a)
    except NotImplementedError:
        logger.warning("winner order for auction %s deferred: orders hook not implemented", a.pk)
        return
    except Exception:
        logger.exception("winner order creation failed for auction %s; will retry", a.pk)
        return
    a.order = order
    a.settlement_status = Auction.SETTLEMENT_ORDER_CREATED


def finalize(a: Auction, now, result=None) -> None:
    """Close ``a``. The caller holds the auction row lock inside ``transaction.atomic()``."""
    lead = Bid.objects.filter(pk=a.leading_bid_id).first() if a.leading_bid_id else None
    if lead is None:
        result = Auction.RESULT_NO_BIDS
    elif a.reserve_price and lead.amount < a.reserve_price:
        result = Auction.RESULT_RESERVE_NOT_MET
    else:
        result = result or Auction.RESULT_SOLD
    a.status, a.result, a.closed_at = Auction.STATUS_ENDED, result, now

    if result in (Auction.RESULT_SOLD, Auction.RESULT_BOUGHT_NOW):
        a.winner_id, a.winning_amount = lead.bidder_id, lead.amount
        a.payment_due_at = now + PAYMENT_WINDOW
        _attempt_winner_order(a)
    else:
        a.settlement_status = Auction.SETTLEMENT_NONE
        services.release_stock(a)
    a.save()
    pk = a.pk
    transaction.on_commit(lambda: _notify_close(pk))


def close_auction_now(auction_id) -> str:
    """Close one auction if due. Returns ``closed | noop | not_due | missing``."""
    with transaction.atomic():
        try:
            a = Auction.objects.select_for_update(of=("self",)).get(pk=auction_id)
        except Auction.DoesNotExist:
            return "missing"
        if a.status in (Auction.STATUS_ENDED, Auction.STATUS_CANCELLED):
            return "noop"
        now = timezone.now()
        if now < a.ends_at:  # extended since this task was queued
            if a.ends_at - now <= ETA_ARM_WINDOW:
                pk, ends_at = a.pk, a.ends_at
                transaction.on_commit(lambda: services.arm_close(pk, ends_at))
            return "not_due"
        finalize(a, now)
    return "closed"


def settle_pending_order(auction_id) -> str:
    """Retry the winner-order hook for one ended, won auction. Returns ``settled | pending | noop``."""
    with transaction.atomic():
        try:
            a = Auction.objects.select_for_update(of=("self",)).get(pk=auction_id)
        except Auction.DoesNotExist:
            return "noop"
        if (
            a.status != Auction.STATUS_ENDED
            or a.settlement_status != Auction.SETTLEMENT_PENDING_ORDER
        ):
            return "noop"
        _attempt_winner_order(a)
        a.save(update_fields=["order", "settlement_status", "updated_at"])
        created = a.settlement_status == Auction.SETTLEMENT_ORDER_CREATED
        pk = a.pk
        if created:
            transaction.on_commit(lambda: _notify_order_ready(pk))
    return "settled" if created else "pending"


def sweep() -> dict:
    """Safety net run by beat every 30s (plan 10 section 6)."""
    now = timezone.now()
    activated = Auction.objects.filter(
        status=Auction.STATUS_SCHEDULED, starts_at__lte=now, ends_at__gt=now
    ).update(status=Auction.STATUS_LIVE, updated_at=now)

    due = list(
        Auction.objects.filter(
            status__in=[Auction.STATUS_SCHEDULED, Auction.STATUS_LIVE], ends_at__lte=now
        )
        .order_by("ends_at")
        .values_list("id", flat=True)[:SWEEP_BATCH]
    )
    closed = 0
    for auction_id in due:
        try:
            if close_auction_now(auction_id) == "closed":
                closed += 1
        except Exception:
            logger.exception("sweeper failed to close auction %s", auction_id)

    armed = 0
    for auction_id, ends_at in Auction.objects.filter(
        status=Auction.STATUS_LIVE, ends_at__gt=now, ends_at__lte=now + ETA_ARM_WINDOW
    ).values_list("id", "ends_at"):
        services.arm_close(auction_id, ends_at)  # duplicates are harmless (idempotent close)
        armed += 1
    return {"activated": activated, "closed": closed, "armed": armed}


def settle_pending_orders() -> int:
    """Retry winner orders that could not be created at close time."""
    ids = list(
        Auction.objects.filter(
            status=Auction.STATUS_ENDED, settlement_status=Auction.SETTLEMENT_PENDING_ORDER
        )
        .order_by("closed_at")
        .values_list("id", flat=True)[:SETTLE_BATCH]
    )
    settled = 0
    for auction_id in ids:
        try:
            if settle_pending_order(auction_id) == "settled":
                settled += 1
        except Exception:
            logger.exception("settlement retry failed for auction %s", auction_id)
    return settled


# --------------------------------------------------------------------------- notifications


def _notify_close(auction_id) -> None:
    """Post-commit. Never raises."""
    try:
        a = Auction.objects.select_related("seller").get(pk=auction_id)
        bidders = Bid.objects.filter(auction=a).values_list("bidder_id", flat=True).distinct()
        if a.winner_id:
            link = f"/checkout?order={a.order_id}" if a.order_id else "/account/bids"
            services.notify_safe(
                a.winner_id,
                "auction.won",
                "You won the auction",
                f"You won {a.title}.",
                link,
                data={"auction_id": str(a.pk), "order_id": str(a.order_id) if a.order_id else None},
            )
            seller_kind, seller_title, seller_body = (
                "auction.sold",
                "Your auction sold",
                f"{a.title} sold.",
            )
        else:
            seller_kind, seller_title, seller_body = (
                "auction.unsold",
                "Your auction ended without a sale",
                f"{a.title} did not sell.",
            )
        for bidder_id in bidders:
            if bidder_id == a.winner_id:
                continue
            services.notify_safe(
                bidder_id,
                "auction.lost",
                "Auction ended",
                f"You did not win {a.title}.",
                f"/auctions/{a.pk}",
                data={"auction_id": str(a.pk)},
            )
        services.notify_safe(
            a.seller.user_id,
            seller_kind,
            seller_title,
            seller_body,
            "/seller/auctions",
            data={"auction_id": str(a.pk)},
        )
    except Exception:
        logger.exception("close notifications failed for auction %s", auction_id)


def _notify_order_ready(auction_id) -> None:
    try:
        a = Auction.objects.get(pk=auction_id)
        services.notify_safe(
            a.winner_id,
            "auction.won",
            "Your order is ready to pay",
            f"Your order for {a.title} is ready.",
            f"/checkout?order={a.order_id}",
            data={"auction_id": str(a.pk), "order_id": str(a.order_id)},
        )
    except Exception:
        logger.exception("order-ready notification failed for auction %s", auction_id)
