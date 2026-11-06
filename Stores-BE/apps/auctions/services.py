"""Auction business logic (plan 10 sections 4-7).

Lock order everywhere in this app: Auction -> Bid -> Order -> ProductVariant.
Views stay thin; every state transition and money rule lives here or in ``closing``.
"""

import logging
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F, Q, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from .constants import ETA_ARM_WINDOW
from .errors import ApiError
from .models import Auction, AuctionWatch, Bid
from .permissions import is_seller_verified

logger = logging.getLogger(__name__)

CENT = Decimal("0.01")


def q2(value) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


# --------------------------------------------------------------------------- helpers


def is_verified_buyer(user) -> bool:
    """``UserVerification.email_verified OR phone_verified`` (README D9)."""
    from apps.authentication.models import UserVerification

    return UserVerification.objects.filter(user=user).filter(
        Q(email_verified=True) | Q(phone_verified=True)
    ).exists()


def notify_safe(user_id, kind, title, body="", link="", data=None):
    """Best-effort ``apps.notifications.services.notify`` (BE-NTF-1). Never raises."""
    try:
        from apps.notifications.services import notify
    except ImportError:
        logger.info("notifications service unavailable; skipped %s for %s", kind, user_id)
        return
    try:
        notify(user_id, kind, title, body, link, data=data)
    except Exception:
        logger.exception("auction notification failed (%s)", kind)


def arm_close(auction_id, ends_at):
    """Queue ``close_auction`` at ``ends_at``. Never raises; skipped in eager mode.

    Callers only invoke this when ``ends_at`` is within ``ETA_ARM_WINDOW`` (Redis
    visibility_timeout would re-deliver longer ETAs repeatedly). In eager mode an ETA
    task runs immediately and the not-due branch would re-arm forever, so skip.
    """
    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        return
    try:
        from .tasks import close_auction

        close_auction.apply_async((str(auction_id),), eta=ends_at)
    except Exception:
        logger.exception("could not arm close for auction %s", auction_id)


def mask_name(user) -> str:
    """``first char + "***" + last char`` of first_name or username. Never email/id."""
    name = (getattr(user, "first_name", "") or getattr(user, "username", "") or "").strip()
    if not name:
        return "***"
    if len(name) == 1:
        return f"{name}***"
    return f"{name[0]}***{name[-1]}"


def seller_bidder_display(user) -> str:
    """First name + last initial (seller view)."""
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()
    if first and last:
        return f"{first} {last[0]}."
    return first or (user.username or "Bidder")


def _lock_auction(auction_id, *, seller=None) -> Auction:
    qs = Auction.objects.select_for_update(of=("self",)).select_related("seller")
    if seller is not None:
        qs = qs.filter(seller=seller)
    try:
        return qs.get(pk=auction_id)
    except (Auction.DoesNotExist, ValueError, TypeError):
        raise ApiError(404, "auction_not_found", "Auction not found.")


def release_stock(a: Auction) -> None:
    """Return the reserved lot to the variant (locks the variant row)."""
    from apps.products.models import ProductVariant

    list(ProductVariant.objects.select_for_update(of=("self",)).filter(pk=a.variant_id))
    ProductVariant.objects.filter(pk=a.variant_id).update(
        quantity=Coalesce(F("quantity"), Value(0)) + a.quantity
    )


def _check_can_bid(a: Auction, user, now) -> None:
    """Shared guards for ``place_bid`` and ``buy_now`` (caller holds the auction lock)."""
    if a.status == Auction.STATUS_SCHEDULED and a.starts_at <= now < a.ends_at:
        a.status = Auction.STATUS_LIVE  # lazy activation; persisted by the caller's save
    if a.status != Auction.STATUS_LIVE or now >= a.ends_at:
        raise ApiError(409, "auction_not_live", "This auction is not live.")
    if not is_seller_verified(a.seller):
        raise ApiError(409, "auction_not_live", "This auction is not live.")
    if a.seller.user_id == user.id:
        raise ApiError(403, "seller_cannot_bid", "You cannot bid on your own auction.")
    if not is_verified_buyer(user):
        raise ApiError(403, "bidder_not_verified", "Verify your email or phone to bid.")


# --------------------------------------------------------------------------- bidding


def place_bid(*, auction_id, user, amount: Decimal, idempotency_key: str):
    """Returns ``(bid, created)``; ``created`` is False on an idempotent replay."""
    amount = q2(amount)
    with transaction.atomic():
        a = _lock_auction(auction_id)
        prior = Bid.objects.filter(
            auction=a, bidder=user, idempotency_key=idempotency_key
        ).first()
        if prior:
            if prior.amount != amount:
                raise ApiError(422, "idempotency_key_mismatch", "Idempotency-Key was used with a different amount.")
            return prior, False

        now = timezone.now()  # the server is the clock
        _check_can_bid(a, user, now)

        leader_id = None
        if a.leading_bid_id:
            leader_id = (
                Bid.objects.filter(pk=a.leading_bid_id).values_list("bidder_id", flat=True).first()
            )
        if leader_id == user.id:
            raise ApiError(409, "already_winning", "You are already the highest bidder.")

        min_next = a.next_min_bid()
        if amount < min_next:
            raise ApiError(409, "bid_too_low", "Your bid is below the minimum.", min_next_bid=str(min_next))

        try:
            with transaction.atomic():
                bid = Bid.objects.create(
                    auction=a,
                    bidder=user,
                    amount=amount,
                    idempotency_key=idempotency_key,
                    placed_at=now,
                )
        except IntegrityError:
            # Backstop: another bid already holds this price. Report a fresh minimum.
            fresh = Auction.objects.get(pk=a.pk)
            raise ApiError(
                409, "bid_too_low", "Your bid is below the minimum.", min_next_bid=str(fresh.next_min_bid())
            )

        a.current_price, a.leading_bid, a.bid_count = amount, bid, a.bid_count + 1
        extended = bool(a.soft_close_seconds) and (a.ends_at - now) <= timedelta(
            seconds=a.soft_close_seconds
        )
        if extended:
            a.ends_at = now + timedelta(seconds=a.soft_close_seconds)
        a.save(
            update_fields=["status", "current_price", "leading_bid", "bid_count", "ends_at", "updated_at"]
        )
        auction_pk, new_ends_at, title = a.pk, a.ends_at, a.title
        transaction.on_commit(
            lambda: _after_bid(auction_pk, new_ends_at, extended, leader_id, title)
        )
    return bid, True


def _after_bid(auction_id, ends_at, extended, leader_id, title):
    """Post-commit side effects. Must never raise."""
    try:
        if extended:
            arm_close(auction_id, ends_at)
        if leader_id:
            notify_safe(
                leader_id,
                "auction.outbid",
                "You have been outbid",
                f"Someone placed a higher bid on {title}.",
                f"/auctions/{auction_id}",
                data={"auction_id": str(auction_id)},
            )
    except Exception:
        logger.exception("after-bid hook failed for auction %s", auction_id)


def buy_now(*, auction_id, user, idempotency_key: str):
    """Instant purchase while ``bid_count == 0``. Returns ``(auction, created)``."""
    from . import closing

    with transaction.atomic():
        a = _lock_auction(auction_id)
        prior = Bid.objects.filter(
            auction=a, bidder=user, idempotency_key=idempotency_key
        ).first()
        if prior:
            if not prior.is_buy_now:
                raise ApiError(422, "idempotency_key_mismatch", "Idempotency-Key was used for a different action.")
            return a, False

        now = timezone.now()
        _check_can_bid(a, user, now)
        if a.buy_now_price is None or a.bid_count != 0:
            raise ApiError(409, "buy_now_unavailable", "Buy now is not available for this auction.")

        bid = Bid.objects.create(
            auction=a,
            bidder=user,
            amount=a.buy_now_price,
            is_buy_now=True,
            idempotency_key=idempotency_key,
            placed_at=now,
        )
        a.current_price, a.leading_bid, a.bid_count = bid.amount, bid, 1
        closing.finalize(a, now, result=Auction.RESULT_BOUGHT_NOW)
    return a, True


# --------------------------------------------------------------------------- watch


def set_watch(*, auction, user, watching: bool) -> bool:
    if watching:
        AuctionWatch.objects.get_or_create(auction=auction, user=user)
    else:
        AuctionWatch.objects.filter(auction=auction, user=user).delete()
    return watching


# --------------------------------------------------------------------------- winner order


def create_winner_order(auction):
    """Create the winner's pending order. **Hook for BE-ORD-1.**

    Delegates to ``apps.orders.services.create_order_for_auction(auction) -> Order``
    (plan 20 section 2). Until that function exists this raises ``NotImplementedError``;
    ``closing`` catches it, logs, and leaves ``settlement_status='pending_order'`` so the
    sweeper retries after BE-ORD-1 lands. No change is needed in this app once the
    function exists.

    Contract BE-ORD-1 must satisfy:
      * Called inside the auction-close transaction (a savepoint) with the auction row
        locked; the caller assigns ``auction.order`` from the return value.
      * Must NOT touch stock (the lot was reserved at auction creation).
      * Idempotent on ``UniqueConstraint(source, source_id)``: if an order for
        ``source="auction", source_id=auction.id`` exists, return it unchanged.
      * Fields available: ``auction.id``, ``.winner`` (user), ``.seller``, ``.currency``,
        ``.winning_amount`` (total), ``.quantity``, ``.variant`` (-> ``.product``),
        ``.title``, ``.payment_due_at`` (= closed_at + 48h).
      * Order: ``source="auction"``, ``source_id=auction.id``, ``user=winner``,
        ``seller``, ``currency``, ``subtotal=total_amount=winning_amount``,
        ``order_status="Pending"``, ``payment_status="unpaid"``,
        ``payment_due_at=auction.payment_due_at``, ``pay_mode="Online"``; one OrderItem
        (product, variant, title, quantity=lot qty, unit_price=(amount/qty) quantised,
        total_price=amount).
    """
    try:
        from apps.orders import services as orders_services

        create = orders_services.create_order_for_auction
    except (ImportError, AttributeError):
        raise NotImplementedError(
            "BE-ORD-1: apps.orders.services.create_order_for_auction is not implemented yet"
        )
    return create(auction)


# --------------------------------------------------------------------------- seller writes


def _currency_base() -> str:
    from apps.store.models import StoreConfig

    return StoreConfig.singleton().currency_base


def create_auction(*, seller, data: dict, idempotency_key: str):
    """Returns ``(auction, created)``. Reserves the lot from the variant's stock."""
    from apps.products.models import ProductVariant

    prior = Auction.objects.filter(seller=seller, create_idempotency_key=idempotency_key).first()
    if prior:
        return prior, False
    if not is_seller_verified(seller):
        raise ApiError(403, "seller_not_verified", "Your seller account must be verified first.")

    now = timezone.now()
    try:
        with transaction.atomic():
            try:
                variant = (
                    ProductVariant.objects.select_for_update(of=("self",))
                    .select_related("product")
                    .get(pk=data["variant_id"], product__seller_profile=seller)
                )
            except (ProductVariant.DoesNotExist, ValueError, TypeError):
                raise ApiError(404, "variant_not_found", "Variant not found.")
            lot = data.get("quantity", 1)
            available = variant.quantity or 0
            if available < lot:
                raise ApiError(409, "insufficient_stock", "Not enough stock for this lot.", available=available)

            starts_at = data.get("starts_at") or now
            ends_at = data["ends_at"]
            ProductVariant.objects.filter(pk=variant.pk).update(quantity=F("quantity") - lot)
            auction = Auction.objects.create(
                seller=seller,
                variant=variant,
                title=data["title"],
                description=data.get("description", ""),
                quantity=lot,
                currency=_currency_base(),
                starting_price=data["starting_price"],
                min_increment=data["min_increment"],
                reserve_price=data.get("reserve_price"),
                buy_now_price=data.get("buy_now_price"),
                starts_at=starts_at,
                ends_at=ends_at,
                original_ends_at=ends_at,
                soft_close_seconds=data.get("soft_close_seconds", 120),
                status=Auction.STATUS_LIVE if starts_at <= now else Auction.STATUS_SCHEDULED,
                create_idempotency_key=idempotency_key,
            )
            _arm_if_due(auction, now)
    except IntegrityError:
        prior = Auction.objects.filter(seller=seller, create_idempotency_key=idempotency_key).first()
        if prior:
            return prior, False
        raise
    return auction, True


def _arm_if_due(auction: Auction, now) -> None:
    if auction.ends_at - now <= ETA_ARM_WINDOW:
        pk, ends_at = auction.pk, auction.ends_at
        transaction.on_commit(lambda: arm_close(pk, ends_at))


EDITABLE_FIELDS = (
    "title",
    "description",
    "starting_price",
    "min_increment",
    "reserve_price",
    "buy_now_price",
    "starts_at",
    "ends_at",
    "soft_close_seconds",
)


def update_auction(*, seller, auction_id, data: dict) -> Auction:
    """Edit a not-yet-started auction with no bids. Locks the auction first."""
    with transaction.atomic():
        a = _lock_auction(auction_id, seller=seller)
        now = timezone.now()
        if not (
            a.status == Auction.STATUS_SCHEDULED and now < a.starts_at and a.bid_count == 0
        ):
            raise ApiError(409, "not_editable", "This auction can no longer be edited.")
        for field in EDITABLE_FIELDS:
            if field in data:
                setattr(a, field, data[field])
        a.original_ends_at = a.ends_at
        if a.starts_at <= now:
            a.status = Auction.STATUS_LIVE
        a.save()
        _arm_if_due(a, now)
    return a


def cancel_auction(*, auction_id, seller=None, reason: str = "") -> Auction:
    """Cancel a no-bid auction and release its stock. Already cancelled -> returned as is."""
    with transaction.atomic():
        a = _lock_auction(auction_id, seller=seller)
        if a.status == Auction.STATUS_CANCELLED:
            return a
        if a.status == Auction.STATUS_ENDED or a.bid_count > 0:
            raise ApiError(409, "not_cancellable", "This auction cannot be cancelled.")
        release_stock(a)
        a.status = Auction.STATUS_CANCELLED
        a.cancelled_at = timezone.now()
        a.cancel_reason = (reason or "")[:255]
        a.save()
    return a
