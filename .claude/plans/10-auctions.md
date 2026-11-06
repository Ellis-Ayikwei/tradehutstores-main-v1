# 10 — Bid Central (Auctions) — FROZEN CONTRACT

Status: **frozen** once the user answers README D2 (charge-at-close is assumed below).
Shared conventions (errors, money, idempotency, pagination, permissions, `notify()`, `orders.services`) are in `20-seller-and-checkout-gaps.md` §0–§2. Builders must read §0 there first.

## 1. Goal / non-goals

**Goal.** Sellers list a variant as a timed auction. Buyers browse, watch and bid, and see winning/outbid. The auction closes server-side and idempotently, and the winner gets a pending order and pays via the normal payment flow.

**Non-goals (v1).** Proxy/auto-bidding. Websockets/Channels/SSE (polling only). Pre-authorisation holds (D2). Dutch/reverse/multi-lot auctions. Second-chance offers to the runner-up. Bid retraction. Watcher "ending soon" pushes. Unpaid-winner strikes. Admin auction UI beyond Django admin.

## 2. Spec validation (`.claude/design-system/bid-rfq-spec.md`)

| Spec item | Verdict vs current schema | Frozen decision |
| --- | --- | --- |
| App `apps/bids/` | AGENTS §7 says `apps/auctions/` | `apps/auctions/` |
| `Auction.variant` FK ProductVariant | OK (`products.ProductVariant`, stock = `quantity`) | Keep. Stock for the lot is **reserved at creation** |
| `seller` FK `sellers.SellerProfile` | OK | Keep, PROTECT |
| `draft` and `settled` statuses | AGENTS §4 statuses: scheduled/live/ending_soon/ended/cancelled | Drop `draft` (create = scheduled/live). Drop `settled` (payment lives on the Order). `ending_soon` is **derived**, not stored |
| `current_bid`, `bid_count`, `winner` denorm | OK | Rename `current_price`. Add `leading_bid` FK, `winning_amount`, `result`, `order`, `closed_at` |
| `Bid.max_amount`, `is_auto` | Proxy is out of scope | **Removed** |
| `Bid.is_winning` flag | Requires a 2-row update per bid | **Removed**. Leader = `Auction.leading_bid` |
| Ordering by `created_at` | `BaseModel.created_at` is `auto_now` (bug, audit §1) | Explicit `placed_at` / `created_on` fields |
| `soft_close_seconds` | AGENTS anti-snipe | Keep (window = extension) |
| `django-q` or `celery-beat` | Celery present; no beat | Celery task + built-in beat schedule (BE-0) |
| No idempotency, no verification check | AGENTS §4 requires both | Added |
| No buy-now rule | | Buy-now only while `bid_count == 0` |

## 3. Models (`apps/auctions/models.py`) — all inherit `BaseModel`

### Auction (`db_table="auctions"`)

| Field | Type | Notes |
| --- | --- | --- |
| seller | FK `sellers.SellerProfile`, PROTECT, `related_name="auctions"` | |
| variant | FK `products.ProductVariant`, PROTECT, `related_name="auctions"` | must belong to `seller` |
| title | Char(200) | snapshot |
| description | Text, blank | |
| quantity | PositiveInteger, default 1 | units in the lot; reserved from `variant.quantity` |
| currency | Char(3) | `StoreConfig.singleton().currency_base` at create |
| starting_price | Decimal(12,2) | > 0 |
| min_increment | Decimal(12,2) | ≥ 0.01 |
| reserve_price | Decimal(12,2), null | ≥ starting_price |
| buy_now_price | Decimal(12,2), null | > max(starting_price, reserve_price) |
| current_price | Decimal(12,2), null | amount of the leading bid |
| bid_count | PositiveInteger, default 0 | |
| leading_bid | FK `Bid`, null, SET_NULL, `related_name="+"` | |
| starts_at | DateTime | |
| ends_at | DateTime | moves on anti-snipe |
| original_ends_at | DateTime | audit |
| soft_close_seconds | PositiveInteger, default 120 | 0..600 |
| status | Char(12) choices `scheduled, live, ended, cancelled`, db_index | |
| result | Char(20) null, choices `sold, bought_now, reserve_not_met, no_bids` | set on close |
| winner | FK User, null, SET_NULL, `related_name="won_auctions"` | |
| winning_amount | Decimal(12,2), null | |
| order | FK `orders.Order`, null, SET_NULL, `related_name="+"` | winner's order |
| closed_at, cancelled_at | DateTime null | |
| cancel_reason | Char(255) blank | |
| create_idempotency_key | Char(64) | |
| created_on | DateTime default `timezone.now`, db_index | use instead of `created_at` |

Constraints:
- `CheckConstraint starting_price > 0`
- `CheckConstraint min_increment > 0`
- `CheckConstraint ends_at > starts_at`
- `CheckConstraint reserve_price IS NULL OR reserve_price >= starting_price`
- `CheckConstraint buy_now_price IS NULL OR buy_now_price > starting_price`
- `UniqueConstraint(seller, create_idempotency_key)`

Indexes: `(status, ends_at)`, `(status, starts_at)`, `(seller, status)`.

### Bid (`db_table="auction_bids"`)

| Field | Type |
| --- | --- |
| auction | FK Auction, PROTECT, `related_name="bids"` |
| bidder | FK User, PROTECT, `related_name="auction_bids"` |
| amount | Decimal(12,2) |
| is_buy_now | Bool default False |
| idempotency_key | Char(64) |
| placed_at | DateTime default `timezone.now`, db_index |

Constraints: `UniqueConstraint(auction, bidder, idempotency_key)` (replay) and **`UniqueConstraint(auction, amount)`** (DB backstop: no two bids at one price). Indexes: `(auction, -amount)`, `(bidder, -placed_at)`.

### AuctionWatch (`db_table="auction_watches"`)
`auction` FK CASCADE `related_name="watches"`, `user` FK CASCADE, `created_on`. `UniqueConstraint(auction, user)`.

Constants (`apps/auctions/constants.py`, not settings): `ENDING_SOON = 1h`, `MIN_DURATION = 1h`, `MAX_DURATION = 14d`, `MAX_START_AHEAD = 30d`, `PAYMENT_WINDOW = 48h` (order due), `ETA_ARM_WINDOW = 90s`, `RECENT_BIDS = 10`.

## 4. State machine

Stored `status`:

| From | Event | Guard | To | Side effects |
| --- | --- | --- | --- | --- |
| — | seller create | `starts_at > now` | scheduled | reserve stock |
| — | seller create | `starts_at ≤ now` | live | reserve stock, arm close |
| scheduled | lazy activate (bid/read/sweeper) | `starts_at ≤ now < ends_at` | live | |
| scheduled / live | seller/admin cancel | `bid_count == 0` | cancelled | release stock |
| live | place bid | rules §5 | live | maybe extend `ends_at` |
| live | buy-now | `bid_count == 0`, `buy_now_price` set | ended (`bought_now`) | order created |
| live / scheduled | close | `now ≥ ends_at` | ended | `sold`: order. `no_bids` / `reserve_not_met`: release stock |
| ended / cancelled | anything | — | (no-op) | idempotent |

Derived `display_status` (serializer, computed from `timezone.now()`):
`cancelled` if cancelled → `ended` if status ended or `now ≥ ends_at` → `scheduled` if `now < starts_at` → `ending_soon` if `ends_at − now ≤ ENDING_SOON` → `live`.

Per-viewer `my_status` (only if the viewer has ≥ 1 bid, else `null`):

| Condition | my_status |
| --- | --- |
| not finalized, `leading_bid.bidder == me` | `winning` |
| not finalized, otherwise | `outbid` |
| ended, `winner == me` | `won` |
| ended, otherwise (incl. reserve_not_met) | `lost` |

`reserve_met`: `null` if no reserve, else `current_price ≥ reserve_price`. The reserve *value* is never exposed to buyers.

## 5. Bid placement — the transaction (`services.place_bid`)

```python
def place_bid(*, auction_id, user, amount: Decimal, idempotency_key: str) -> tuple[Bid, bool]:
    amount = amount.quantize(Decimal("0.01"))            # serializer already rejected <= 0 / > 2dp
    with transaction.atomic():
        a = (Auction.objects.select_for_update(of=("self",))   # no nullable outer joins in FOR UPDATE
             .get(pk=auction_id))                             # DoesNotExist -> 404
        prior = Bid.objects.filter(auction=a, bidder=user, idempotency_key=idempotency_key).first()
        if prior:
            if prior.amount != amount: raise ApiError(422, "idempotency_key_mismatch")
            return prior, False                               # replay -> HTTP 200
        now = timezone.now()                                  # server is the clock
        if a.status == "scheduled" and a.starts_at <= now < a.ends_at:
            a.status = "live"
        if a.status != "live" or now >= a.ends_at:            raise ApiError(409, "auction_not_live")
        if a.seller.user_id == user.id:                       raise ApiError(403, "seller_cannot_bid")
        if not is_verified_buyer(user):                       raise ApiError(403, "bidder_not_verified")
        leader_id = a.leading_bid.bidder_id if a.leading_bid_id else None
        if leader_id == user.id:                              raise ApiError(409, "already_winning")
        min_next = a.starting_price if a.current_price is None else a.current_price + a.min_increment
        if amount < min_next:                                 raise ApiError(409, "bid_too_low", min_next_bid=str(min_next))
        bid = Bid.objects.create(auction=a, bidder=user, amount=amount,
                                 idempotency_key=idempotency_key, placed_at=now)
        a.current_price, a.leading_bid, a.bid_count = amount, bid, a.bid_count + 1
        extended = a.soft_close_seconds and (a.ends_at - now) <= timedelta(seconds=a.soft_close_seconds)
        if extended:
            a.ends_at = now + timedelta(seconds=a.soft_close_seconds)
        a.save(update_fields=["status", "current_price", "leading_bid", "bid_count", "ends_at", "updated_at"])
        transaction.on_commit(lambda: _after_bid(a.id, a.ends_at, extended, leader_id))
    return bid, True
```

Rules:
- `is_verified_buyer(user)` = `UserVerification` (`apps/authentication/models.py:107`) exists with `email_verified or phone_verified` (README D9).
- All competing bids for one auction serialize on the auction row lock. The `UniqueConstraint(auction, amount)` is a backstop: catch `IntegrityError` → `409 bid_too_low` with a fresh `min_next_bid`.
- `_after_bid` (post-commit, must never raise): if extended → `close_auction.apply_async((id,), eta=ends_at)`. If `leader_id` → `notify(leader_id, "auction.outbid", ...)`.
- Throttle: `ScopedRateThrottle` scope `bids` = `30/min` (BE-0 adds the rate).
- **Lock order** everywhere in this app: Auction → Bid → Order → ProductVariant.

## 6. Closing — Celery task + sweeper (`apps/auctions/tasks.py`, `closing.py`)

```python
@shared_task(bind=True, max_retries=5, default_retry_delay=10, acks_late=True)
def close_auction(self, auction_id):
    with transaction.atomic():
        a = Auction.objects.select_for_update(of=("self",)).get(pk=auction_id)
        if a.status in ("ended", "cancelled"):
            return "noop"                                   # idempotent
        now = timezone.now()
        if now < a.ends_at:                                 # extended since this task was queued
            if a.ends_at - now <= ETA_ARM_WINDOW:
                transaction.on_commit(lambda: close_auction.apply_async((a.id,), eta=a.ends_at))
            return "not_due"
        finalize(a, now)                                    # same transaction
    return "closed"

def finalize(a, now, result=None):                          # caller holds the auction lock
    lead = a.leading_bid
    if lead is None:                                         result = "no_bids"
    elif a.reserve_price and lead.amount < a.reserve_price:  result = "reserve_not_met"
    else:                                                    result = result or "sold"
    a.status, a.result, a.closed_at = "ended", result, now
    if result in ("sold", "bought_now"):
        a.winner_id, a.winning_amount = lead.bidder_id, lead.amount
        a.order = orders_services.create_order_for_auction(a)   # idempotent: UniqueConstraint(source, source_id)
    else:
        release_stock(a)   # ProductVariant select_for_update; quantity = F("quantity") + a.quantity
    a.save()
    transaction.on_commit(lambda: _notify_close(a.id))
```

Scheduling (never schedule an ETA more than `ETA_ARM_WINDOW` ahead, because Redis `visibility_timeout` (1h) re-delivers long-ETA tasks repeatedly):
- On create/publish/edit: if `ends_at − now ≤ ETA_ARM_WINDOW` → `apply_async(eta=ends_at)`.
- On anti-snipe extension: always arm (the extension is ≤ 600s).
- **`sweep_auctions`** (beat, every 30s):
  1. `filter(status="scheduled", starts_at__lte=now, ends_at__gt=now).update(status="live")`
  2. For each id in `filter(status__in=["scheduled","live"], ends_at__lte=now)[:200]`, call `close_auction(id)` **synchronously** (each is its own transaction; catch and log per id).
  3. For each id in `filter(status="live", ends_at__gt=now, ends_at__lte=now+ETA_ARM_WINDOW)`, call `close_auction.apply_async(eta=ends_at)`. Duplicates are harmless.
- Correctness never depends on close timing: `place_bid` rejects at `now ≥ ends_at` and `display_status` shows `ended`. Close latency only affects when the order appears (≤ 30s worst case).

Notifications on close (`_notify_close`): winner `auction.won` (link `/checkout?order=<id>`), each distinct other bidder `auction.lost`, seller `auction.sold` / `auction.unsold`.

Order on win (contract owned by `orders.services`, see 20 §2): `create_order_for_auction(auction) -> Order`. It is called inside the caller's transaction and **does not touch stock** (already reserved). It creates `Order(source="auction", source_id=auction.id, user=winner, seller, currency, subtotal=winning_amount, total_amount=winning_amount, order_status="Pending", payment_status="unpaid", payment_due_at=now+48h, pay_mode="Online")` plus one `OrderItem(product=variant.product, variant, title, quantity=lot qty, unit_price=(amount/qty).quantize, total_price=amount)`. The buyer pays via `POST /orders/{id}/pay/` (address + shipping chosen then). Unpaid by the due date → `orders.tasks.expire_unpaid_orders` cancels it, and `cancel_order` returns variant stock.

## 7. Endpoints (prefix `/tradehut/api/v1/auctions/`, ids are `<uuid:pk>`)

All responses with auction data include `server_time` (ISO8601 UTC). Money values are strings. List endpoints use `StandardPagination` (`{count,next,previous,results}` + `server_time`).

### Buyer / public

| # | Method & path | Perm | Request | Response | Errors | Idempotency |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | `GET /auctions/` | AllowAny | `?status=live\|ending_soon\|scheduled\|ended`, `category=<uuid>`, `seller=<uuid>`, `q=`, `sort=ending_soonest\|newest\|price_asc\|price_desc\|most_bids`, `page`, `page_size≤50` | page of **AuctionCard** | 400 bad filter | safe |
| A2 | `GET /auctions/<id>/` | AllowAny (auth optional) | — | **AuctionDetail** | 404 (cancelled auctions are visible only to their seller) | safe |
| A3 | `GET /auctions/<id>/state/` | AllowAny | — | **AuctionState**; header `Cache-Control: no-store` | 404 | safe; throttle scope `auction_poll` 120/min |
| A4 | `GET /auctions/<id>/bids/` | AllowAny | `page` | page of `{amount, bidder: masked, placed_at, is_me, is_buy_now}` sorted `-amount` | 404 | safe |
| A5 | `POST /auctions/<id>/bids/` | IsAuthenticated | header `Idempotency-Key`; `{"amount":"125.00"}` | 201 new / 200 replay: `{"bid":{id,amount,placed_at}, "state": AuctionState}` | 400 `invalid_amount`/`idempotency_key_required`; 401; 403 `seller_cannot_bid`/`bidder_not_verified`; 404; 409 `auction_not_live`/`bid_too_low{min_next_bid}`/`already_winning`; 422 `idempotency_key_mismatch`; 429 | key per (auction, bidder) |
| A6 | `POST /auctions/<id>/buy-now/` | IsAuthenticated | header `Idempotency-Key`; `{}` | 201/200 `{"order_id", "state"}` | 403 as A5; 409 `buy_now_unavailable`/`auction_not_live` | replay via the `is_buy_now` Bid with that key |
| A7 | `POST /auctions/<id>/watch/` · `DELETE` same | IsAuthenticated | — | 200 `{"is_watching": bool}` | 404 | naturally idempotent |
| A8 | `GET /auctions/me/bidding/` | IsAuthenticated | `?my_status=winning\|outbid\|won\|lost`, `page` | page of AuctionCard + `my_status`, `my_highest_bid`, `order_id`, `order_payment_status` (if won) | — | safe |
| A9 | `GET /auctions/me/watching/` | IsAuthenticated | `page` | page of AuctionCard | — | safe |

Buy-now service: lock auction → replay check → same guards as A5 → require `buy_now_price` and `bid_count == 0` → create `Bid(amount=buy_now_price, is_buy_now=True)` → set leader → `finalize(a, now, result="bought_now")` in the same transaction.

**AuctionCard**: `id, title, image (variant main image → product main image, absolute URL), currency, starting_price, current_price, next_min_bid, bid_count, buy_now_price (only if buy_now_available), buy_now_available, starts_at, ends_at, display_status, reserve_met, seller{id,business_name,store_slug,is_verified}, product_id, is_watching (auth only, else false)`.
**AuctionState**: `id, status, display_status, currency, starting_price, current_price, min_increment, next_min_bid, bid_count, starts_at, ends_at, reserve_met, buy_now_price, buy_now_available, leading_bidder (masked), my_status, my_highest_bid, is_watching, result, order_id (winner only), server_time`.
**AuctionDetail**: AuctionState + `title, description, quantity, soft_close_seconds, images[], product{id,name,slug,category{id,name}}, variant{id,sku,name,attributes[{name,value}]}, seller{id,business_name,store_slug,is_verified,rating}, recent_bids[10], watch_count`.
Masking: `first char + "***" + last char` of `first_name or username`. Never expose emails or ids of other bidders.
N+1: list querysets use `select_related("seller","variant__product")`, prefetch images, and annotate `is_watching` / `my_highest_bid` with `Exists`/`Subquery`. Tests assert the query count.

### Seller (prefix `/auctions/seller/`) — `IsSeller`; writes also need `IsVerifiedSeller`; querysets always `filter(seller=request.user.seller_profile)` (another seller's id → 404)

| # | Method & path | Request | Response | Errors / rules |
| --- | --- | --- | --- | --- |
| S1 | `GET /auctions/seller/` | `?status=`, `q`, `page` | page of SellerAuctionRow = AuctionCard + `reserve_price, result, winner_display, order_id, order_status, payment_status, original_ends_at` | — |
| S2 | `POST /auctions/seller/` | header `Idempotency-Key`; `{variant_id, title, description?, quantity=1, starting_price, min_increment, reserve_price?, buy_now_price?, starts_at?, ends_at, soft_close_seconds=120}` | 201 SellerAuctionDetail (200 on replay) | 400 field rules (§3 constraints; duration 1h–14d; `starts_at` in [now−5min, now+30d]); 403 `seller_not_verified`; 404 `variant_not_found` (not mine); 409 `insufficient_stock{available}`. Atomic: lock variant, check `quantity ≥ lot`, decrement, create, arm ETA if due |
| S3 | `GET /auctions/seller/<id>/` | — | SellerAuctionDetail = AuctionDetail + `reserve_price`, bids (last 50) with `bidder_display` (first name + last initial) | 404 |
| S4 | `PATCH /auctions/seller/<id>/` | any of S2 fields except `variant_id`/`quantity` | 200 detail | 409 `not_editable` unless `status=scheduled` and `now < starts_at` and `bid_count=0`. Lock auction first |
| S5 | `POST /auctions/seller/<id>/cancel/` | `{reason?}` | 200 detail | 409 `not_cancellable` if `bid_count>0` or ended. Already cancelled → 200 (idempotent). Releases stock |

Admin: register `Auction`, `Bid` (read-only), `AuctionWatch` in Django admin. Add an admin action "Cancel (no bids)" that calls the S5 service.

## 8. Tests (`apps/auctions/tests/`)

Service: (1) first bid must be ≥ starting_price; (2) `< current+increment` → `bid_too_low` with `min_next_bid`; (3) seller self-bid 403; (4) unverified 403; (5) before `starts_at` / after `ends_at` → 409 (patch `django.utils.timezone.now`; no freezegun); (6) leader re-bid → `already_winning`; (7) replay returns the same bid with no double count, and same key + different amount → 422; (8) anti-snipe extends only inside the window; (9) lazy activation; (10) create validates ownership, stock, durations, idempotent create, and decrements stock; (11) cancel rules + stock release + idempotent; (12) `my_status` matrix; (13) `display_status` matrix.
Close: (14) no bids → `no_bids`, stock restored; (15) reserve not met; (16) sold → exactly one order with correct totals/due date and **no second stock decrement**; (17) close twice → one order; (18) extended `ends_at` → `not_due`; (19) sweeper activates, closes overdue, arms near-ending; (20) buy-now closes with an order, and is unavailable once `bid_count > 0`.
**Concurrency** (`TransactionTestCase`, Postgres, `threading.Barrier`, each thread calls `connection.close()` at the end): (21) two users bid the **same amount** simultaneously → exactly one `Bid` row, one 201 and one `bid_too_low`, `bid_count == 1`; (22) 10 threads with mixed amounts → accepted bids strictly increase in `placed_at` order, `bid_count == rows`, `current_price == max(accepted)`; (23) two concurrent `close_auction` → one order; (24) buy-now vs bid race → exactly one outcome.
API: (25) anonymous can read A1–A4, and writes are 401; (26) seller B gets 404 on seller A's S3/S4/S5; (27) `assertNumQueries` bound on A1 and A8 (page of 20).

## 9. Tasks

| ID | Owner | Files (exclusive) | Depends | Acceptance |
| --- | --- | --- | --- | --- |
| **BE-AUC-1** | be-builder | `Stores-BE/apps/auctions/{models.py, constants.py, services.py, serializers.py, views.py, urls.py, admin.py}`, `apps/auctions/migrations/0001_initial.py`, `apps/auctions/tests/{__init__,test_bidding,test_concurrency,test_api,test_seller}.py` | BE-0 (20) | `python manage.py check`; `makemigrations auctions` → one migration; `python manage.py test apps.auctions` (tests 1–13, 21–22, 25–27) green on Postgres; A1–A5, A7–A9, S1–S5 respond per contract (curl evidence) |
| **BE-AUC-2** | be-builder (same builder as AUC-1 preferred) | `apps/auctions/{tasks.py, closing.py}`, `apps/auctions/tests/test_close.py`; may append the buy-now view/route to `views.py`/`urls.py`/`services.py` (sequential ownership after AUC-1) | BE-AUC-1, BE-ORD-1, BE-NTF-1 | tests 14–20, 23–24 green; with `celery -A backend worker -B` running locally, a 2-minute auction closes within 30s of `ends_at` and creates one order |
| **FE-AUC-1** | fe-builder | `Stores-FE/lib/auctionsApi.ts`, `Stores-FE/hooks/useServerClock.ts`, `Stores-FE/hooks/useAuctionState.ts`, `Stores-FE/components/Auctions/{AuctionCard,Countdown,AuctionStatusBadge,BidPanel,BidHistory,WatchButton}.tsx` | BE-AUC-1 merged | `npm run build` + `npm run lint`. Countdown uses `ends_at − (Date.now() + offset)`, where offset comes from `server_time` (median of the last 3 samples). `useAuctionState`: SWR `refreshInterval` 2000 when `ending_soon`, 5000 otherwise, `refreshWhenHidden:false`. BidPanel generates `crypto.randomUUID()` per bid intent and reuses it on retry; optimistic update from the response `state`; 409 `bid_too_low` refreshes the minimum inline |
| **FE-AUC-2** | fe-builder | `Stores-FE/app/auctions/page.tsx` (full rewrite, Bid Central hub) | FE-AUC-1 | Tabs Live / Ending soon / Upcoming / Ended via A1; 2-col (375) → 4–6-col grid; skeleton, empty and error states; no antd; works at 375/768/1024/1440 with no horizontal scroll |
| **FE-AUC-3** | fe-builder | `Stores-FE/app/auctions/[id]/page.tsx`, `Stores-FE/app/auctions/[id]/layout.tsx` (metadata only) | FE-AUC-1 | Gallery, state, BidPanel, history, watch; sticky mobile "Place bid" bar; winning/outbid/won/lost/ended/cancelled states render; network tab shows polling stops when the tab is hidden; golden path: two browsers outbid each other and the loser sees "Outbid" within 5s |
| **FE-AUC-4** | fe-builder | `Stores-FE/app/account/bids/page.tsx` (rewrite) | FE-AUC-1, BE-AUC-2, FE-CHK-1 (pay link) | A8 tabs winning/outbid/won/lost; won + unpaid shows "Pay now" → `/checkout?order=<id>` with payment due countdown |
| **ADM-AUC** | admin-builder | `Stores-Admin/src/pages/seller/auctions/{index,AuctionForm,AuctionDetail}.tsx` (replaces the ADM-S0 placeholder), `Stores-Admin/src/services/sellerAuctionsService.ts` | ADM-0, ADM-S0, BE-AUC-1 | shadcn only; `npx tsc --noEmit` + `npm run build`. Table with server pagination (cards under `md`). Create form uses react-hook-form + zod: pick my variant, which needs the `GET /products/seller/` endpoint from BE-PRD-1. Detail shows bids, cancel (disabled when bids > 0), and result/order/payment status. Seller B cannot open seller A's auction (404 screen) |

## 10. Risks
- **Money/race**: all bid/close/buy-now paths lock the auction row first. `select_for_update` with `select_related` on nullable FKs errors on Postgres, so always use `of=("self",)`.
- **Celery ETA duplication** with Redis visibility timeout is mitigated by the ≤ 90s arm window plus idempotent close.
- **Beat not deployed** → auctions never close. The sweeper is the only path for long auctions, so BE-0's Procfile `beat` line plus a Railway service are mandatory (README D11).
- Stock reserved at create: an auction cancelled via Django admin *field edit* (not the action) leaks stock. Make `status` read-only in admin.
- Clock skew: server-only time comparisons; FE offset is display only.
- Unpaid winners (charge-at-close) — README D2.
