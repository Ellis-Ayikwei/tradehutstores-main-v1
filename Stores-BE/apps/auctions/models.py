from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from apps.core.models import BaseModel

from .constants import ENDING_SOON

CENT = Decimal("0.01")


class Auction(BaseModel):
    STATUS_SCHEDULED = "scheduled"
    STATUS_LIVE = "live"
    STATUS_ENDED = "ended"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_LIVE, "Live"),
        (STATUS_ENDED, "Ended"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    RESULT_SOLD = "sold"
    RESULT_BOUGHT_NOW = "bought_now"
    RESULT_RESERVE_NOT_MET = "reserve_not_met"
    RESULT_NO_BIDS = "no_bids"
    RESULT_CHOICES = [
        (RESULT_SOLD, "Sold"),
        (RESULT_BOUGHT_NOW, "Bought now"),
        (RESULT_RESERVE_NOT_MET, "Reserve not met"),
        (RESULT_NO_BIDS, "No bids"),
    ]

    # Winner-order hand-off to orders (BE-ORD-1). ``pending_order`` means the auction is
    # closed and won but ``services.create_winner_order`` has not produced an order yet;
    # the sweeper retries those.
    SETTLEMENT_NONE = "not_applicable"
    SETTLEMENT_PENDING_ORDER = "pending_order"
    SETTLEMENT_ORDER_CREATED = "order_created"
    SETTLEMENT_CHOICES = [
        (SETTLEMENT_NONE, "Not applicable"),
        (SETTLEMENT_PENDING_ORDER, "Pending order"),
        (SETTLEMENT_ORDER_CREATED, "Order created"),
    ]

    seller = models.ForeignKey(
        "sellers.SellerProfile", on_delete=models.PROTECT, related_name="auctions"
    )
    variant = models.ForeignKey(
        "products.ProductVariant", on_delete=models.PROTECT, related_name="auctions"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    currency = models.CharField(max_length=3)

    starting_price = models.DecimalField(max_digits=12, decimal_places=2)
    min_increment = models.DecimalField(max_digits=12, decimal_places=2)
    reserve_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    buy_now_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    current_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    bid_count = models.PositiveIntegerField(default=0)
    leading_bid = models.ForeignKey(
        "auctions.Bid", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    original_ends_at = models.DateTimeField()
    soft_close_seconds = models.PositiveIntegerField(default=120)

    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default=STATUS_SCHEDULED, db_index=True
    )
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, null=True, blank=True)
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="won_auctions",
    )
    winning_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    order = models.ForeignKey(
        "orders.Order", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    settlement_status = models.CharField(
        max_length=16, choices=SETTLEMENT_CHOICES, default=SETTLEMENT_NONE
    )
    payment_due_at = models.DateTimeField(null=True, blank=True)

    closed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.CharField(max_length=255, blank=True)

    create_idempotency_key = models.CharField(max_length=64)
    created_on = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "auctions"
        constraints = [
            models.CheckConstraint(condition=Q(starting_price__gt=0), name="auction_start_price_gt_0"),
            models.CheckConstraint(condition=Q(min_increment__gt=0), name="auction_min_increment_gt_0"),
            models.CheckConstraint(condition=Q(ends_at__gt=F("starts_at")), name="auction_ends_after_start"),
            models.CheckConstraint(
                condition=Q(reserve_price__isnull=True) | Q(reserve_price__gte=F("starting_price")),
                name="auction_reserve_gte_start",
            ),
            models.CheckConstraint(
                condition=Q(buy_now_price__isnull=True) | Q(buy_now_price__gt=F("starting_price")),
                name="auction_buy_now_gt_start",
            ),
            models.UniqueConstraint(
                fields=["seller", "create_idempotency_key"], name="uniq_auction_seller_create_key"
            ),
        ]
        indexes = [
            models.Index(fields=["status", "ends_at"], name="auc_status_ends_idx"),
            models.Index(fields=["status", "starts_at"], name="auc_status_starts_idx"),
            models.Index(fields=["seller", "status"], name="auc_seller_status_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"

    # ---- derived values -------------------------------------------------

    @property
    def is_finalized(self) -> bool:
        return self.status in (self.STATUS_ENDED, self.STATUS_CANCELLED)

    def display_status(self, now=None) -> str:
        now = now or timezone.now()
        if self.status == self.STATUS_CANCELLED:
            return "cancelled"
        if self.status == self.STATUS_ENDED or now >= self.ends_at:
            return "ended"
        if now < self.starts_at:
            return "scheduled"
        if self.ends_at - now <= ENDING_SOON:
            return "ending_soon"
        return "live"

    def next_min_bid(self) -> Decimal:
        if self.current_price is None:
            return self.starting_price
        return self.current_price + self.min_increment

    def reserve_met(self):
        """``None`` when there is no reserve; the reserve value itself is never exposed."""
        if self.reserve_price is None:
            return None
        return self.current_price is not None and self.current_price >= self.reserve_price

    def accepts_bids(self, now=None) -> bool:
        now = now or timezone.now()
        return (
            self.status in (self.STATUS_SCHEDULED, self.STATUS_LIVE)
            and self.starts_at <= now < self.ends_at
        )

    def buy_now_available(self, now=None) -> bool:
        return (
            self.buy_now_price is not None
            and self.bid_count == 0
            and self.accepts_bids(now)
        )


def compute_my_status(auction, *, user_id, has_bid, leader_id, now=None):
    """Per-viewer status (plan 10 section 4). ``None`` when the viewer never bid."""
    if not has_bid:
        return None
    if auction.status == Auction.STATUS_ENDED:
        return "won" if auction.winner_id == user_id else "lost"
    if auction.status == Auction.STATUS_CANCELLED:
        return None
    return "winning" if leader_id == user_id else "outbid"


class Bid(BaseModel):
    auction = models.ForeignKey(Auction, on_delete=models.PROTECT, related_name="bids")
    bidder = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="auction_bids"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_buy_now = models.BooleanField(default=False)
    idempotency_key = models.CharField(max_length=64)
    placed_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "auction_bids"
        constraints = [
            models.UniqueConstraint(
                fields=["auction", "bidder", "idempotency_key"], name="uniq_bid_replay_key"
            ),
            # DB backstop: no two bids at one price on the same auction.
            models.UniqueConstraint(fields=["auction", "amount"], name="uniq_bid_auction_amount"),
        ]
        indexes = [
            models.Index(fields=["auction", "-amount"], name="bid_auction_amount_idx"),
            models.Index(fields=["bidder", "-placed_at"], name="bid_bidder_placed_idx"),
        ]

    def __str__(self):
        return f"{self.amount} on {self.auction_id}"


class AuctionWatch(BaseModel):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name="watches")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auction_watches"
    )
    created_on = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "auction_watches"
        constraints = [
            models.UniqueConstraint(fields=["auction", "user"], name="uniq_auction_watch"),
        ]
