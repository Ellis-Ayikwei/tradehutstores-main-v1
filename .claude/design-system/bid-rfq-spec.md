# Bid + RFQ — Backend Data Model Spec

The redesign introduces **two new commerce modes**: live auctions (Bid)
and reverse-marketplace requests (RFQ). Both need new Django apps under
[`Stores-BE/apps/`](../../Stores-BE/apps/).

## Existing context

- `apps/products/models.py` defines `Product`, `ProductVariant`, `ProductImage`.
  A product currently has implicit "buy now" semantics (variants carry `price`).
- `apps/orders/models.py` defines `Order`, `OrderItem`, `ReturnRequest`.
- `apps/sellers/models.py` defines `SellerProfile` (linked from `Product.seller_profile`).
- `apps/users/models.User` is the auth user.
- `apps/core/models.BaseModel` provides `id` (UUID), `created_at`, `updated_at`.

## Design

Add two new Django apps:

- `apps/bids/` — auctions over an existing `ProductVariant`
- `apps/rfqs/` — buyer requests + seller quotes (no product needed up front)

### Why two apps, not one

- Bid is **forward**: seller posts an item, buyers raise the price.
- RFQ is **reverse**: buyer posts a need, sellers compete with quotes.
  Different state machines, different lifecycles, different queries.

---

## `apps/bids/models.py`

```python
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.core.models import BaseModel
from apps.products.models import ProductVariant


class Auction(BaseModel):
    STATUS = (
        ("draft",     "Draft"),
        ("scheduled", "Scheduled"),
        ("live",      "Live"),
        ("ended",     "Ended"),
        ("cancelled", "Cancelled"),
        ("settled",   "Settled"),  # winner paid
    )

    variant = models.ForeignKey(
        ProductVariant, on_delete=models.PROTECT, related_name="auctions"
    )
    seller = models.ForeignKey(
        "sellers.SellerProfile", on_delete=models.PROTECT, related_name="auctions"
    )
    title = models.CharField(max_length=255)        # snapshot, decoupled from product
    description = models.TextField(blank=True)

    starting_bid = models.DecimalField(max_digits=12, decimal_places=2)
    bid_increment = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    reserve_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    buy_now_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    soft_close_seconds = models.PositiveIntegerField(default=120)  # anti-snipe extension

    status = models.CharField(max_length=16, choices=STATUS, default="draft", db_index=True)

    # denorm for fast list queries
    current_bid = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    bid_count   = models.PositiveIntegerField(default=0)
    winner      = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="won_auctions",
    )

    class Meta:
        db_table = "auctions"
        indexes = [
            models.Index(fields=["status", "ends_at"]),
            models.Index(fields=["seller", "status"]),
        ]

    @property
    def is_live(self) -> bool:
        now = timezone.now()
        return self.status == "live" and self.starts_at <= now < self.ends_at

    @property
    def time_remaining(self):
        return max(self.ends_at - timezone.now(), timezone.timedelta(0))

    @property
    def next_min_bid(self) -> Decimal:
        return (self.current_bid or self.starting_bid) + self.bid_increment


class Bid(BaseModel):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name="bids")
    bidder  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bids"
    )
    amount  = models.DecimalField(max_digits=12, decimal_places=2)
    max_amount = models.DecimalField(  # proxy bidding ceiling
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    is_winning = models.BooleanField(default=False)
    is_auto    = models.BooleanField(default=False)  # placed by proxy engine

    class Meta:
        db_table = "bids"
        ordering = ["-amount", "-created_at"]
        indexes = [
            models.Index(fields=["auction", "-amount"]),
            models.Index(fields=["bidder", "-created_at"]),
        ]


class AuctionWatch(BaseModel):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name="watchers")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        db_table = "auction_watches"
        unique_together = [("auction", "user")]
```

### Bid lifecycle (state machine)

```
draft → scheduled → live → ended → settled
                                 → cancelled
```

Transitions:

- `place_bid(auction, bidder, amount)` validates `amount >= next_min_bid`,
  creates `Bid`, updates `Auction.current_bid` + `bid_count`, marks the
  prior winning bid `is_winning=False` and the new one `is_winning=True`.
  If within `soft_close_seconds` of `ends_at`, extend `ends_at` by the
  same window (anti-snipe).
- `close_auction()` sets `status="ended"`, freezes `winner` from the
  highest `is_winning=True` bid (only if `>= reserve_price` or no reserve).
  Emits `auction.ended` signal — order creation hooks here.

### Background work

- A scheduled task (`apps/bids/tasks.py`) flips `scheduled → live` and
  `live → ended` based on timestamps. Use `django-q` or `celery-beat`
  (whichever the project already runs — confirm before adding).

---

## `apps/rfqs/models.py`

```python
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models
from apps.core.models import BaseModel
from apps.catalog.models import Category


class RFQ(BaseModel):
    STATUS = (
        ("draft",     "Draft"),
        ("open",      "Open"),         # accepting quotes
        ("reviewing", "Reviewing"),    # buyer evaluating
        ("awarded",   "Awarded"),      # supplier picked
        ("closed",    "Closed"),       # no winner
        ("cancelled", "Cancelled"),
    )

    BUYER_TIER = (("standard","Standard"), ("verified","Verified"), ("pro","Pro"))

    reference = models.CharField(max_length=20, unique=True, db_index=True)  # e.g. RFQ-9921
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="rfqs"
    )
    buyer_tier = models.CharField(max_length=12, choices=BUYER_TIER, default="standard")

    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="rfqs"
    )
    quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=32, blank=True)  # "units", "kg", "m²" …

    budget_min = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="USD")

    location_country = models.CharField(max_length=2, blank=True)   # ISO
    location_city = models.CharField(max_length=120, blank=True)

    closes_at = models.DateTimeField()
    is_sustainable = models.BooleanField(default=False)             # "Sustainable Source" badge
    requires_verification = models.BooleanField(default=False)      # "Verified Buyer" badge

    status = models.CharField(max_length=16, choices=STATUS, default="open", db_index=True)
    awarded_quote = models.ForeignKey(
        "Quote", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="awarded_for"
    )

    # denormalized
    quote_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "rfqs"
        indexes = [
            models.Index(fields=["status", "closes_at"]),
            models.Index(fields=["category", "status"]),
        ]


class RFQAttachment(BaseModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="rfq_attachments/")
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100, blank=True)


class RFQSpec(BaseModel):
    """Free-form spec rows: 'Material: 7075 Aluminum', 'Lead time: 14 days'."""
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="specs")
    label = models.CharField(max_length=120)
    value = models.CharField(max_length=500)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]


class Quote(BaseModel):
    STATUS = (
        ("submitted", "Submitted"),
        ("shortlisted", "Shortlisted"),
        ("rejected", "Rejected"),
        ("accepted", "Accepted"),
        ("withdrawn", "Withdrawn"),
    )

    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="quotes")
    supplier = models.ForeignKey(
        "sellers.SellerProfile", on_delete=models.PROTECT, related_name="quotes"
    )
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    lead_time_days = models.PositiveIntegerField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=STATUS, default="submitted", db_index=True)

    class Meta:
        db_table = "quotes"
        unique_together = [("rfq", "supplier")]   # one quote per supplier per RFQ
        indexes = [
            models.Index(fields=["rfq", "status"]),
            models.Index(fields=["supplier", "-created_at"]),
        ]


class QuoteAttachment(BaseModel):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="quote_attachments/")
    filename = models.CharField(max_length=255)
```

### RFQ lifecycle

```
draft → open → reviewing → awarded → (Order created)
              ↘ closed
              ↘ cancelled
```

Transitions:

- `submit_quote(rfq, supplier, …)` blocked when `rfq.status != "open"`.
  Atomically increment `rfq.quote_count`.
- `award_quote(rfq, quote)` sets `rfq.status="awarded"`, `rfq.awarded_quote=quote`,
  `quote.status="accepted"`, marks all other quotes `rejected`. Emits
  `rfq.awarded` signal — downstream creates an `Order` with `pay_mode`
  based on quote.

## DRF wiring (separate `serializers.py` + `views.py` per app)

- `Auction`: `list`, `retrieve`, `create` (seller), `cancel` (seller), `place_bid` action.
- `Bid`: nested under auction; list returns the buyer's own bids.
- `RFQ`: `list` (public open RFQs), `retrieve`, `create` (buyer), `award` action.
- `Quote`: `submit` (supplier), `withdraw`, `shortlist` (buyer).

## Settings additions

```python
# settings.py
INSTALLED_APPS += [
    "apps.bids",
    "apps.rfqs",
]
```

## Migrations

After adding models:

```bash
cd Stores-BE
python manage.py makemigrations bids rfqs
python manage.py migrate
```

## Out of scope here

- Payment hold/escrow (separate spec; affects `apps/payments`).
- Real-time bid push (WebSockets/SSE — pick `channels` or polling later).
- Notification rules — owned by `apps/notifications`.
