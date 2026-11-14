# 26 - Sponsored products (paid product promotion)

Status: **approved** by the user on 2026-11-13 (S1 to S6 as below, staff review required). Nav lock
lifted for one entry: "Promotions" in `Stores-Seller/components/seller-central/shell/navItems.ts`.

## 1. Goal / non-goals

Sellers pay a fixed fee to promote one of their listings for a fixed period. Promoted listings appear
with a "Sponsored" label on search results, category pages, a homepage strip and product pages. Staff
review, approve, reject, stop, and grant free promotions, and manage the packages and prices.

Non-goals (v1): pay per click, bidding between sellers for slots, seller wallets, promoting a whole
store, banner creatives (that is `apps/ads`), discount codes (that is `apps/promotions`; the name
"promotion" in code is avoided for this feature to keep the two apart).

## 2. Decisions

| # | Decision | Answer |
| --- | --- | --- |
| S1 | Pricing | **Fixed packages** defined by staff: name, surfaces, duration in days, price (GHS). Paid up front via Paystack |
| S2 | Surfaces | **Search results, category pages, homepage strip, product page** ("Sponsored" label on every card) |
| S3 | Staff stops a paid, running promotion | **Staff chooses**: refund unused time pro rata, or no refund with a required reason. Rejection before it starts always refunds in full |
| S4 | Review | Paid promotions wait in **pending review**; staff approve or reject. (Alternative the user may pick: auto-approve listings that are already Active from verified sellers, staff can still stop) |
| S5 | Seller cancels | Allowed only before approval: full refund. After approval only staff can stop |
| S6 | Capacity | Optional `max_concurrent` per package (null = unlimited) so sponsored cards cannot flood a surface |

## 3. Seven Questions

**1. INPUTS.**
- Seller purchase: `variant`-free; `product_id` (untrusted UUID, must be the caller's own product, status
  Active), `package_id` (untrusted, must be an active package), `starts_on` (optional date, local Ghana
  = UTC; missing means "as soon as approved"; must be today to +60 days), header `Idempotency-Key`
  (required, max 64 chars). Price is **never** taken from the client: it is copied from the package
  row at purchase time. Amounts: GHS, `DecimalField(12,2)`, major units.
- Staff actions: promotion id (UUID), `reason` (required for reject and for stop-without-refund,
  max 500), `refund` (`"prorata"` or `"none"`) on stop. Comp create: `product_id`, `package_id`,
  `starts_on`, `note`.
- Paystack webhook: untrusted until the HMAC is checked (existing view does this); amount and currency
  are re-checked against the promotion row.
- Public read: `surface` in {search, category, home, product}, `q` (string, may be empty), `category`
  (UUID or slug as `GET search/` already accepts), `product` (UUID), `limit` (1 to 12, default per
  surface). All may be missing or junk; junk returns an empty list, never 500.

**2. OUTPUT.**
- Purchase `POST ads/sponsored/seller/` -> 201 `{promotion, authorization_url, reference}`; replay
  with the same key -> 200 with the same body. Errors use the existing `{detail, code, ...}` shape:
  400 field errors, 403 `seller_not_verified`, 404 `product_not_found` (not mine or not Active),
  404 `package_not_found`, 409 `already_promoted` (same product + overlapping surface already pending
  or running), 409 `sold_out`, 503 `payments_unavailable` (Paystack not configured or down; nothing
  stays in `awaiting_payment` that the seller can't retry).
- Side effects: one `SponsoredPromotion` row, one Paystack initialize call. On payment: status ->
  `pending_review`, staff notification. On approve: `starts_at`/`ends_at` fixed, seller notification.
  On reject/stop with refund: Paystack refund request, `refund_*` fields, seller notification.
- Public `GET ads/sponsored/?surface=...` -> `{"results": [ProductCard + "sponsored_id"]}` using the
  same product card serializer the search endpoint returns, so the storefront renders them with its
  existing card. Cached nothing in process; see Q4.

**3. INVARIANTS.**
- `price_paid` equals the package price at purchase and never changes afterwards.
- `refunded_amount <= price_paid`, always; a promotion is refunded at most once (DB check constraint
  + `select_for_update` on the row in every refund path).
- A promotion is shown to buyers only when: status `approved`, `starts_at <= now < ends_at`, the
  product is Active and in stock, the seller profile is active and not suspended. All derived at query
  time; no beat job flips it on or off.
- Status moves only along section 5 edges. `paid_at` is set once; a paid promotion never returns to
  `awaiting_payment`.
- Authorization: seller endpoints are `IsSeller` (read) and `IsVerifiedSeller` (write), querysets
  `filter(seller=request.user.seller_profile)`; another seller's id -> 404. Staff endpoints use the
  ads app's staff permission (`apps/ads/permissions.py`). Buyers only reach the public read.
- One product cannot hold two overlapping pending or running promotions that share a surface
  (checked under the package/product lock at purchase and at approve).
- Nothing counted twice: a webhook and the seller's verify call racing settle the payment once
  (row lock + `paid_at IS NULL` guard), same pattern as `payment_flow.mark_session_paid`.

**4. FAILURE MODES.**
- Double click on Pay: `UniqueConstraint(seller, idempotency_key)`; replay returns the same row and
  the same Paystack URL.
- Paystack down at initialize: the row stays `awaiting_payment` with no reference; the response is 503
  and the seller can retry with a new key. `awaiting_payment` rows older than 30 minutes are marked
  `abandoned` by the existing beat cadence (new periodic task, idempotent).
- Webhook arrives twice, or before the redirect: locked, idempotent, second run is a no-op.
- Amount or currency mismatch in the webhook: mark `payment_problem=True`, keep status
  `awaiting_payment`, log ids only, surface it to staff; never auto-approve.
- Refund call fails or times out: refund recorded as `pending`; the existing refund webhook events
  (`refund.processed` / `refund.failed`) settle it; staff can retry from the admin. The promotion stop
  itself is not rolled back (stopping the display is the priority).
- Product goes inactive, out of stock or the seller is suspended mid-run: the promotion silently stops
  showing (derived rule), the seller page shows "Paused: listing not available"; no automatic refund
  (time keeps running, stated in the purchase terms).
- Concurrency: two sellers buying the last slot of a capped package: `select_for_update` on the
  package row while counting; the loser gets 409 `sold_out` before Paystack is called.
- Public read with thousands of promotions: the live set is filtered in SQL with an index on
  `(status, starts_at, ends_at)` and limited; random rotation with `order_by("?")` only over the
  filtered set (small by construction because of capacity); one query plus the card prefetch.
- Rounding: pro rata refund = `price_paid * remaining_seconds / total_seconds`, rounded **down** to
  2dp (`ROUND_DOWN`); the platform keeps the sub-pesewa fraction. Stop before start = full refund.
  Pure function `prorated_refund(price_paid, starts_at, ends_at, now) -> Decimal`, unit tested.

**5. SIMPLEST.**
1. Staff create packages. 2. Seller picks product + package (one screen, from the listing row).
3. Server copies the price, creates the row, calls Paystack, returns the URL. 4. Webhook or verify
marks it paid -> pending review. 5. Staff approve (start = max(now, starts_on)) or reject (full
refund). 6. The public endpoint returns whatever is live right now; the storefront shows it on top
of the existing results with its existing product card.
- "Live" is derived, never stored, so there is no activation or expiry job.
- Search and category pages both use `GET search/` on the storefront, so one storefront component
  covers both surfaces; home and product page reuse the same component with a different `surface`.
- Payment reuses `apps/payments/paystack.py` (initialize, verify, create_refund, signature) and the
  existing webhook view (one dispatch branch by reference prefix `spn_`). The minor-unit conversion
  moves into `paystack.to_minor()` so the rule "conversion happens once, in paystack.py" becomes
  true; `payment_flow._minor` delegates to it (two call sites).
- Limitation: sponsored cards are a separate top block, not interleaved inside the organic ranking.
  Interleaving can come later without schema changes.

**6. FEWER CLICKS.**
- "Promote" button on every Active row in Seller Central Listings opens the purchase sheet with that
  product preselected; the package defaults to the last one the seller bought (localStorage), else
  the cheapest.
- Staff review queue opens on "Pending review" with one-click Approve; Reject and Stop open a dialog
  (irreversible money actions are confirmed; approve is reversible via Stop, so no confirm).
- Errors name the field: "This listing already has a running promotion on Search until 20 Nov."

**7. SIMPLE BUT INTELLIGENT.**
- The purchase sheet shows the exact end date ("Runs 7 days from approval, about 14 to 21 Nov") and
  warns when stock is below 5 ("Low stock: the promotion pauses if it sells out").
- Seller list shows impressions and clicks per promotion (section 7, slice P1) so they can judge it.

## 4. Models (`apps/ads/sponsored_models.py`, imported in `apps/ads/models.py`)

### SponsoredPackage
`id` UUID, `name` (80), `description` (240, blank), `surfaces` (JSON list subset of
`search|category|home|product`, at least one), `duration_days` (1 to 90), `price` Decimal(12,2) > 0,
`currency` (3, default base currency), `max_concurrent` (positive int, null = unlimited), `is_active`,
`sort_order`, timestamps. Deleting a package with promotions is blocked (PROTECT); staff deactivate it.

### SponsoredPromotion
`id` UUID; `seller` FK SellerProfile (PROTECT); `product` FK Product (PROTECT); `package` FK
(PROTECT); snapshot fields copied at purchase: `surfaces`, `duration_days`, `price_paid`
Decimal(12,2), `currency`; `source` (`seller` | `staff`); `status` (section 5); `starts_on` (date,
null); `starts_at`, `ends_at` (set on approve); payment: `idempotency_key` (64), `reference` (unique,
null), `authorization_url`, `paid_at`, `payment_problem` bool, `provider_payload` JSON (safe fields
only, via `paystack.safe_payload`); review: `reviewed_by` FK user null, `reviewed_at`, `review_note`;
stop: `stopped_by`, `stopped_at`, `stop_reason`; refund: `refunded_amount` Decimal(12,2) default 0,
`refund_status` (`none|pending|succeeded|failed`), `provider_refund_id`, `refund_requested_at`;
timestamps.
Constraints: unique (`seller`, `idempotency_key`); check `refunded_amount <= price_paid`; check
`ends_at > starts_at` when both set. Index (`status`, `starts_at`, `ends_at`), (`product`, `status`).

### SponsoredStat (slice P1)
`promotion` FK, `day` date, `impressions`, `clicks`; unique (`promotion`, `day`); increments with
`F()` via `update_or_create` guarded by the unique constraint.

## 5. State machine

```
awaiting_payment --paid--> pending_review --approve--> approved --(derived: scheduled / live / ended)
awaiting_payment --30 min, unpaid--> abandoned
pending_review  --reject (full refund)--> rejected
pending_review  --seller cancel (full refund)--> cancelled
approved        --staff stop (prorata | none)--> stopped
staff comp create ----------------------------> approved   (price_paid 0, source staff, no payment)
```
Display status for clients: `awaiting_payment, pending_review, scheduled, live, paused, ended,
rejected, cancelled, stopped, abandoned` (`paused` = approved + in window but listing not showable).

## 6. Endpoints (prefix `/tradehut/api/v1/ads/sponsored/`)

| # | Method & path | Who | Request | Response / errors |
| --- | --- | --- | --- | --- |
| P1 | `GET packages/` | IsSeller | - | active packages, sorted |
| P2 | `GET seller/?status=&page=` | IsSeller | - | page of my promotions with display status, dates, price, refund, stats (P1 slice) |
| P3 | `POST seller/` | IsVerifiedSeller | `Idempotency-Key`; `{product_id, package_id, starts_on?}` | 201/200 `{promotion, authorization_url, reference}`; errors in section 3 Q2 |
| P4 | `GET seller/<id>/` | IsSeller | - | detail; another seller's -> 404 |
| P5 | `POST seller/<id>/verify/` | IsSeller | - | asks Paystack (rate limited 1 per 2 s per row, like `PaystackVerifyView`) and settles; returns detail |
| P6 | `POST seller/<id>/cancel/` | IsVerifiedSeller | - | only `awaiting_payment` (no refund) or `pending_review` (full refund); else 409 `not_cancellable` |
| P7 | `GET staff/?status=&q=&seller=&page=` | staff | - | page of all promotions |
| P8 | `GET staff/<id>/` | staff | - | detail incl. payment and refund fields |
| P9 | `POST staff/<id>/approve/` | staff | `{note?}` | only from `pending_review`; re-checks overlap and capacity; 409 otherwise |
| P10 | `POST staff/<id>/reject/` | staff | `{reason}` | only from `pending_review`; full refund |
| P11 | `POST staff/<id>/stop/` | staff | `{refund: "prorata"\|"none", reason}` | only from `approved` and not ended; reason required when `none` |
| P12 | `POST staff/<id>/retry-refund/` | staff | - | only `refund_status=failed` |
| P13 | `POST staff/` | staff | `{product_id, package_id, starts_on?, note}` | comp promotion, approved immediately, price 0 |
| P14 | `GET/POST staff/packages/`, `PATCH staff/packages/<id>/` | staff | package fields | no DELETE (deactivate) |
| P15 | `GET /` (public) | AllowAny | `surface, q, category, product, limit` | `{results: [card + sponsored_id]}` |
| P16 | `POST events/` (slice P1) | AllowAny, throttled | `{sponsored_id, type: impression\|click}` | 204; increments `SponsoredStat` |

Webhook: in `PaystackWebhookView`, `charge.success` with reference starting `spn_` dispatches to
`sponsored_services.mark_paid(reference, data)`; refund events fall through to the existing
`process_refund_event`, and when it finds no `OrderRefund`, `sponsored_services.process_refund_event`
matches on `provider_refund_id` or the `spn_` transaction reference.

Callback URL for Paystack: `${SELLER_CENTRAL_URL}/seller-central/promotions/<id>?paid=1`. New env var
`SELLER_CENTRAL_URL` (default `http://localhost:3001`), added to `Stores-BE/.env.example`.

Notifications: reuse `apps/notifications` the way auctions do: seller on approve, reject, stop,
refund result; staff on new `pending_review`.

Surface matching for P15 (all also require the live rule from Q3):
- `search`: package has `search`, and `q` matches product name or category name (`icontains`, each
  term); empty `q` -> nothing. Limit default 2.
- `category`: package has `category`, and product `category` or `sub_category` equals the filter.
  Limit 2.
- `home`: package has `home`. Limit 10.
- `product`: package has `product`, same category as `product`, excluding that product. Limit 4.
Rotation: random among eligible; de-duplicate by product.

## 7. Tasks

| ID | Owner | Files (exclusive) | Depends | Acceptance |
| --- | --- | --- | --- | --- |
| **BE-SPN-1** | be-builder | `apps/ads/sponsored_{models,services,serializers,views,urls,permissions?}.py`, import line in `apps/ads/models.py`, include in `apps/ads/urls.py`, `apps/ads/tests/test_sponsored*.py`; `apps/payments/paystack.py` (`to_minor`), `apps/orders/payment_flow.py` (`_minor` delegates), `apps/payments/views.py` (webhook dispatch only), `backend/settings.py` (`SELLER_CENTRAL_URL`, beat entry for abandon sweep), `Stores-BE/.env.example` | user approval of this plan | `check`; tests green on SQLite (Postgres-only ones skipped and named): purchase + idempotent replay, price copied from package, overlap 409, capacity 409 under lock, webhook settle once (twice delivered), amount mismatch flag, verify path, approve/reject/stop transitions incl. illegal edges, `prorated_refund` table test (before start, mid, last second, after end), refunded <= paid, P15 matching per surface and the live rule (inactive product, suspended seller, out of stock, outside window), seller B cannot read seller A. `makemigrations ads --check --dry-run` ops listed; **no migration file written** |
| **SELL-SPN-1** | fe-builder | `Stores-Seller/lib/seller/sponsored.ts`, `Stores-Seller/app/seller-central/promotions/{page,[id]/page}.tsx`, `Stores-Seller/components/seller-central/promotions/*`, "Promote" action in `components/seller-central/listings/ListingsTable.tsx` | BE-SPN-1, **nav lock lift for one `navItems.ts` entry** | build + lint + tsc. Purchase sheet, redirect to Paystack, return page polls P5 until paid, list with status tabs, detail with dates/refund, cancel |
| **ADM-SPN-1** | admin-builder | `Stores-Admin/src/services/sponsoredAdminService.ts`, `Stores-Admin/src/pages/admin/SponsoredProducts/*`, route registration in `src/router/routes.tsx` (allowed by D17), one entry in `Sidebar.tsx` | BE-SPN-1 | tsc no new errors in touched files + build. Review queue, approve, reject dialog, stop dialog with refund choice and live pro rata preview, retry refund, comp create, packages tab |
| **FE-SPN-1** | fe-builder | `Stores-FE/lib/sponsored.ts`, `Stores-FE/components/Sponsored/SponsoredRow.tsx`, mount points in the search page, category page, homepage and PDP | BE-SPN-1 | build + lint. "Sponsored" grey label per AGENTS section 5, reserved height (no layout shift), renders nothing on empty or error, existing product card reused |
| **BE-SPN-2 / FE-SPN-2** (P1) | be / fe | `SponsoredStat`, P16, beacons from `SponsoredRow`, stats on seller pages | SPN-1 slices | counts increment once per view (IntersectionObserver 50% for 1 s), click counted before navigation via `sendBeacon` |

## 8. Acceptance checks (user-visible)

1. Staff create package "Search boost 7 days, GHS 50, search + category". Seller sees it in the
   Promote sheet with the end-date estimate.
2. Seller promotes an Active listing, pays on Paystack test mode, returns to the promotion page:
   status "Pending review" within a few seconds (webhook or verify).
3. Double-click Pay creates one promotion (Admin list shows one row).
4. Staff approve: storefront search for the product name shows it in the Sponsored row; the category
   page too; the homepage strip and product pages only when the package includes them.
5. Seller archives the listing: the card disappears from the storefront; seller page says "Paused".
6. Staff stop with pro rata at mid-run: refund amount shown before confirming equals the amount sent
   to Paystack; seller sees "Refund pending" then "Refunded".
7. Staff reject a pending one: full refund. Seller cancel while pending: full refund.
8. Seller B opening seller A's promotion URL gets "Not found".

## 9. Risks

- Paystack refunds for MoMo can take days; the UI must show "Refund pending" honestly.
- Sponsored cards must never hide organic results or change their order (trust).
- `order_by("?")` is fine for the small live set; if packages are left uncapped and hundreds run
  at once, switch to a seeded per-day rotation.
