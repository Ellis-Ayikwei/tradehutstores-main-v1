# 20 — P0 gaps: checkout, orders, payments, sellers, listings, payouts, disputes

Source of gaps: `00-audit.md` §2(c). This file also holds the **shared conventions and shared service contracts** that `10-auctions.md` and `11-rfq.md` depend on.

## Goal / non-goals

**Goal.** Ship a working buyer golden path: address → checkout → Paystack (or COD) → order → seller ships → buyer tracks → delivered → seller payout, plus disputes. Also close the two security holes, give sellers onboarding, login and listings, and get the env/lint gates running.

**Non-goals.** Saved cards / card vaulting (never store PANs; `payments.PaymentMethod` stays unused). Automated payouts (Paystack Transfers). Automated refunds via API (admin performs the refund in the Paystack dashboard and records it). Guest checkout. Multi-currency charging (charge in `currency_base`; FX is display only). Promo un-redemption on cancel (P1). Global DRF default-permission flip (Phase 5). Server-side cart as source of truth (checkout takes lines in the request).

---

## §0 Shared conventions (all new endpoints)

- **Errors**: `{"detail": "<human message>", "code": "<snake_code>", ...extra}`. Raise `apps.core.errors.ApiError(status, code, detail=None, **extra)` (an `APIException` subclass whose `.detail` is that dict). Field validation stays as normal DRF 400s.
- **Money**: `DecimalField`, quantize `0.01` with `ROUND_HALF_UP`, serialized as strings, always with a `currency` field. Compare and aggregate in the DB. No floats.
- **Time**: UTC ISO8601. New models carry an explicit `created_on = DateTimeField(default=timezone.now, db_index=True)`. Never order by `BaseModel.created_at` (it is `auto_now`).
- **Idempotency**: header `Idempotency-Key` (≤ 64 chars, UUID recommended), **required** on: `POST /checkout/`, `POST /orders/<id>/pay/`, `POST /payments/seller/payouts/`, plus the auction/RFQ writes listed in 10/11. Missing → `400 idempotency_key_required`. Read it with `apps.core.idempotency.require_idempotency_key(request)`. Persistence is per-domain (a unique constraint on the domain row); there is no generic idempotency table.
- **Pagination**: `apps.core.pagination.StandardPagination` (PageNumber, `page`, `page_size` default 20, max 100) on every new list endpoint.
- **Permissions** (`apps/core/permissions.py`): `IsSeller` (authenticated and `seller_profile` exists with `is_active` and status ≠ suspended), `IsVerifiedSeller` (IsSeller + `verification_status == "verified"`), `IsStaff` (`is_staff`). Every new view declares `permission_classes` explicitly. Seller querysets are filtered by `seller=request.user.seller_profile`; a foreign id → 404.
- **Lock order** (global, to prevent deadlocks): `Auction | RFQ` → `Quote` → `CheckoutSession` → `Order` (by id asc) → `ProductVariant` (by id asc) → `SellerProfile`.
- **Notifications**: `apps.notifications.services.notify(user_id, kind: str, title: str, body: str = "", link: str = "", data: dict | None = None) -> None`. It never raises (logs on failure). Callers invoke it only inside `transaction.on_commit`.

## §1 Order model (additive on top of the uncommitted WIP in `apps/orders/models.py`)

Keep every WIP line. Add:

| Model.field | Type | Notes |
| --- | --- | --- |
| `Order.order_status` | widen `max_length` 10 → 20; choices `Pending, Processing, Shipped, Delivered, Cancelled, Refunded` | existing values stay valid |
| `Order.payment_status` | Char(16) choices `unpaid, paid, refunded, partially_refunded` default `unpaid`, db_index | |
| `Order.currency` | Char(3) default `"GHS"` | set from `currency_base` |
| `Order.seller` | FK `sellers.SellerProfile` null PROTECT `related_name="orders"` | **one order per seller** (README D14) |
| `Order.source` | Char(10) choices `cart, auction, rfq` default `cart` | |
| `Order.source_id` | UUID null | auction.id / rfq.id |
| `Order.placed_at` | DateTime default now, db_index | |
| `Order.payment_due_at`, `paid_at`, `shipped_at`, `delivered_at`, `cancelled_at` | DateTime null | |
| `Order.cancel_reason` | Char(64) blank | `payment_timeout`, `payment_overdue`, `buyer`, `seller`, `admin` |
| `Order.commission_rate` | Decimal(5,2) null | snapshot |
| `Order.commission_amount` | Decimal(12,2) null | |
| `Order.refunded_amount` | Decimal(12,2) default 0 | |
| `OrderItem.title` | Char(255) default "" | snapshot |
| `OrderItem.sku` | Char(100) blank | snapshot |

Constraints and indexes: `UniqueConstraint(fields=["source","source_id"], condition=Q(source__in=["auction","rfq"]), name="uniq_order_per_source")`; Index `(seller, order_status)`, `(user, placed_at)`.

Order transition table (enforced in `orders.services`, never by raw field writes in views):

| From | Event | Actor | To | Effects |
| --- | --- | --- | --- | --- |
| — | checkout online | buyer | Pending/unpaid | stock decremented |
| — | checkout COD | buyer | Processing/unpaid | stock decremented |
| — | auction/RFQ win | system | Pending/unpaid + `payment_due_at` | no stock op |
| Pending | `mark_paid` | webhook/verify | Processing/paid | `paid_at`, `Product.sold_count += qty` |
| Pending | cancel (buyer, timeout, overdue) | buyer/system | Cancelled | restore variant stock for items with a variant |
| Processing | seller cancel | seller | Cancelled | restore stock; if paid → `needs_refund` notify staff |
| Processing | ship | seller | Shipped | Shipment row, `shipped_at`, notify buyer |
| Shipped | confirm delivery | buyer / seller (COD) / admin | Delivered | `delivered_at`; COD → payment_status paid, `sold_count += qty` |
| Delivered/Shipped | refund recorded | admin (via dispute) | Refunded if full, else unchanged | `refunded_amount`, payment_status |

## §2 `apps/orders/services.py` — shared contract (frozen signatures)

```python
def price_cart(user, lines: list[dict], address, delivery_method: str, promo_code: str | None) -> CartQuote
    # lines: [{"variant_id", "quantity"}]; groups by product.seller_profile; Decimal math; no writes
def create_cart_orders(user, quote: CartQuote, address, payment_method: str) -> list[Order]
    # caller holds an atomic block; locks variants (sorted ids), checks + decrements stock, redeems promo
def create_order_for_auction(auction) -> Order          # see 10 §6; no stock op
def create_order_for_rfq(rfq, quote) -> Order           # see 11 §5; no stock op
def price_order_for_payment(order, address, delivery_method: str | None) -> Order   # auction/rfq: sets shipping/tax/total
def mark_paid(order, *, paid_at) -> None                # Pending→Processing, sold_count += qty
def cancel_order(order, *, reason: str, actor) -> None  # restores stock; idempotent on Cancelled
def ship_order(order, *, carrier: str, tracking_number: str, tracking_url: str = "") -> Shipment
def confirm_delivery(order, *, actor) -> None
def record_refund(order, amount: Decimal, *, reference: str) -> None
```

Pricing rules (`price_cart`):
- `unit = variant.get_final_price().quantize(0.01)`.
- Lines with no `product.seller_profile`, an inactive product, `seller.is_accepting_orders=False`, or `quantity < min_buy_amount` → error.
- Shipping per seller order: the enabled `StoreConfig.shipping_methods[id=delivery_method].rate`. It is `0` if the seller-order subtotal ≥ `shipping_free_threshold`, or if **all** lines in that seller order have `Product.free_shipping=True`.
- Tax: if `tax_mode == "exclusive"`, rate = `tax_country_rates` entry matching `address.country` (match by ISO code or label prefix, else `tax_default_rate`) × (subtotal − discount + shipping if `tax_charge_on_shipping`). Inclusive → 0 added.
- Promo: `promotions.services.validate_promo(code, CartContext(...), user)`. Allocate the discount pro-rata across seller orders by eligible subtotal; the last order takes the rounding remainder. Call `redeem_promo` per order inside the transaction; `PromoExhaustedException` → 422 `invalid_promo`.
- Commission: `commission_amount = commission_basis_amount(gross_subtotal, discount_amount, promo) × seller.commission_rate / 100`.

## §3 Payments (`apps/payments`) — models reshaped (the app has no migrations yet; README D6)

- `CheckoutSession`: `user` FK; `idempotency_key` Char(64); `status` (`pending, paid, expired, failed, cod, needs_review`); `provider` (`paystack, cod`); `amount` Decimal(12,2); `currency`; `provider_reference` Char(100) unique null; `authorization_url` URL blank; `orders` M2M `orders.Order`; `expires_at`; `paid_at`; `created_on`. `UniqueConstraint(user, idempotency_key)`.
- `Payment` (keep table name `payments`): `session` FK; `order` FK; `provider`; `reference`; `amount`; `currency`; `status`; `paid_at`; `raw` JSON with the provider payload, **minus authorization/card fields**.
- `Payout`: `seller` FK; `amount`; `currency`; `status` (`requested, processing, paid, failed`); `reference` blank; `note` blank; `requested_at`; `paid_at`; `idempotency_key`. `UniqueConstraint(seller, idempotency_key)`.
- `Refund` (reshape): `order` FK; `dispute` FK null (string ref `disputes.Dispute`); `amount`; `reference`; `created_on`.
- Leave `Transaction` and `PaymentMethod` defined but unused. Do not expose them.

Paystack (`apps/payments/paystack.py`, `requests`, keys from env `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY`, never from StoreConfig JSON — README D3):
- `initialize(session, email, callback_url)`: `POST https://api.paystack.co/transaction/initialize` with `amount = int(amount*100)`, `currency`, `reference = session.id.hex`.
- `verify(reference)`: `GET /transaction/verify/<ref>`.
- Timeouts 10s. Never log the secret key or the full payload.

`mark_session_paid(session_id, provider_data)`: atomic. Lock the session row; if already `paid` → no-op. Check `amount*100 == data.amount` and the currency; on mismatch → `needs_review` and notify staff. If `expired` → `needs_review` (charge after timeout; admin decides refund/revive). Otherwise lock the orders and call `orders.services.mark_paid` on each, create `Payment` rows, set `status=paid`.

### Endpoints (mount: `path("", include("apps.payments.urls"))`)

| # | Method & path | Perm | Request | Response | Errors | Idempotency |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | `POST /checkout/` | IsAuthenticated | `Idempotency-Key`; `{items:[{variant_id, quantity}] (1..50), address_id, delivery_method, payment_method: "paystack"\|"cod", promo_code?, expected_total?}` | 201 (200 replay) `{checkout_id, status, currency, amount, orders:[{id, seller{id,business_name}, subtotal, shipping_cost, tax_amount, promo_discount, total_amount}], payment: {provider, authorization_url, reference} \| null, payment_error?: str}` | 400; 404 `address_not_found`; 409 `out_of_stock{variant_id,available}`, `price_changed{quote}`, `listing_unavailable{variant_id}`, `seller_not_accepting_orders`; 422 `invalid_promo{reason}`, `delivery_method_unavailable`, `payment_method_unavailable` | `(user, key)` on CheckoutSession; replay returns the stored response |
| P2 | `POST /checkout/quote/` | IsAuthenticated | same body without payment | 200 CartQuote (no writes) | as P1 minus stock-lock errors | safe |
| P3 | `POST /checkout/<id>/payment/` | owner | — | 200 `{payment}` (re-initialize if `authorization_url` empty) | 409 `not_pending` | naturally |
| P4 | `POST /payments/paystack/webhook/` | AllowAny; **HMAC-SHA512 of the raw body vs `x-paystack-signature`**, constant-time compare | Paystack event | 200 always after a valid signature; 401 bad signature | — | `charge.success` → `mark_session_paid`; duplicates no-op |
| P5 | `GET /payments/paystack/verify/?reference=` | owner | — | `{status, orders:[{id, order_status, payment_status}]}` | 404 | same code path as P4 |
| P6 | `GET /payments/seller/balance/` | IsSeller | — | `{currency, pending, available, paid_out, min_payout}` | — | safe |
| P7 | `GET /payments/seller/payouts/` · `POST` same | IsSeller / IsVerifiedSeller | POST `Idempotency-Key`; `{amount}` | page of Payout / 201 Payout | 409 `insufficient_balance{available}`, `below_minimum{min}`, `payout_details_missing` | `(seller, key)` |
| P8 | `GET /payments/admin/payouts/?status=` ; `POST /payments/admin/payouts/<id>/mark-processing/` ; `mark-paid/ {reference}` ; `mark-failed/ {note}` | IsStaff | | Payout | 409 invalid transition | naturally |

P1 transaction: `atomic { session get-or-create by (user,key) with select_for_update; if exists → return stored; price_cart; compare expected_total (if given) → 409 price_changed; create_cart_orders; session.orders.set(...); amount = Σ totals; COD → status cod; online → expires_at = now+30m }`. **After commit**: Paystack `initialize`. On failure → return 201 with `payment: null, payment_error`, and the client calls P3.

Balance (P6/P7, one DB aggregate in `payments/services.py::seller_balance(seller)`):
- `cleared` = Σ over `orders(seller, payment_status in (paid, partially_refunded), order_status="Delivered", delivered_at ≤ now − 7d, no open dispute)` of `total_amount − commission_amount − refunded_amount`. For `pay_mode="COD"` orders the contribution is `−commission_amount` (README D4).
- `pending` = the same expression for paid orders that aren't cleared.
- `paid_out` = Σ payouts with status in (`requested`, `processing`, `paid`).
- `available = cleared − paid_out`.
- P7 POST locks the `SellerProfile` row (`select_for_update`), recomputes, validates `≥ StoreConfig.payments_min_payout` and `≤ available`, and requires `bank_account_number` to be set.

Sweeper `apps/orders/tasks.py::expire_unpaid_orders` (beat 300s):
1. Pending sessions with `expires_at < now` → lock the session → `expired` → `cancel_order(reason="payment_timeout")` for each order.
2. Orders with `source in (auction, rfq)`, Pending/unpaid, `payment_due_at < now`, and no pending unexpired session → `cancel_order(reason="payment_overdue")`.

## §4 Orders endpoints (`apps/orders/urls.py`, mounted `orders/`)

| # | Method & path | Perm | Notes |
| --- | --- | --- | --- |
| O1 | `GET /orders/` | IsAuthenticated (mine) | `?status=`, page. OrderRow `{id, placed_at, seller{id,business_name}, source, order_status, payment_status, total_amount, currency, item_count, first_item{title,image}, payment_due_at}` |
| O2 | `GET /orders/<id>/` | owner | OrderDetail = OrderRow + items[{title, sku, quantity, unit_price, total_price, product_id, variant_id, image}], address snapshot, subtotal/shipping/tax/promo/commission (commission hidden from buyer), shipments[{carrier, tracking_number, tracking_url, shipped_at, delivered_at}], timeline[{status, at}] |
| O3 | `POST /orders/<id>/pay/` | owner | `Idempotency-Key`; `{address_id, delivery_method?}` → `price_order_for_payment` + new CheckoutSession (single order) → P1 response shape. 409 `order_not_payable` (not Pending/unpaid or past due). Online only (README D2) |
| O4 | `POST /orders/<id>/cancel/` | owner | only Pending → Cancelled; idempotent |
| O5 | `POST /orders/<id>/confirm-delivery/` | owner | Shipped → Delivered; idempotent |
| O6 | `GET /orders/seller/` · `GET /orders/seller/<id>/` | IsSeller | `?status=`, `q` (order id / buyer name), page. Includes buyer name + shipping address (for fulfilment), commission, net |
| O7 | `POST /orders/seller/<id>/ship/` | IsSeller | `{carrier, tracking_number, tracking_url?}`; Processing → Shipped; replay with the same tracking number → 200; 409 `not_shippable` |
| O8 | `POST /orders/seller/<id>/cancel/` | IsSeller | Processing only; `{reason}` |
| O9 | `POST /orders/seller/<id>/confirm-delivery/` | IsSeller | COD only (cash collected) |
| O10 | `GET /orders/admin/` · `GET /orders/admin/<id>/` · `POST /orders/admin/<id>/cancel/` · `POST /orders/admin/<id>/confirm-delivery/` | IsStaff | filter status, seller, payment_status, date range |

Shipment model (`apps/shipments/models.py`, first migration): add `carrier` Char(100), `tracking_url` URL blank, `status` (`shipped, delivered`), `shipped_at`, `delivered_at`. Make `shipping_address`, `shipping_date` and `expected_delivery_date` nullable. Leave `ShippingAddress` unused.

## §5 Sellers (`apps/sellers`, mounted `sellers/`)

- New model `SellerDocument(seller FK, kind: id_card|business_registration|proof_of_address|other, file, status: pending|approved|rejected, note, created_on)`.
- Data migration: create Group `"Sellers"` and add existing seller users to it. `create_seller_profile` adds the user to the group.

| # | Method & path | Perm | Notes |
| --- | --- | --- | --- |
| SE1 | `POST /sellers/onboarding/` | IsAuthenticated | `{business_name, business_email, business_phone, business_address, business_registration_number?, tax_id?}` → 201 profile (pending); 409 `already_seller` |
| SE2 | `GET/PATCH /sellers/me/` | IsSeller | profile + store policies + bank details (write; read returns `bank_account_last4` only); `is_accepting_orders` toggle |
| SE3 | `GET/POST /sellers/me/documents/` | IsSeller | multipart; ≤ 10MB pdf/jpg/png |
| SE4 | `GET /sellers/me/stats/` | IsSeller | `{sales_30d, orders_30d, orders_to_ship, low_stock_variants (quantity ≤ 5), active_listings, live_auctions, open_rfq_matches, currency}` (aggregates; no N+1) |
| SE5 | `GET /sellers/` and `GET /sellers/list/` (alias for Admin AddProduct) | AllowAny | verified + active, paginated; public fields only |
| SE6 | `GET /sellers/<slug_or_uuid>/` | AllowAny | public profile (FE `app/seller/[id]` calls this) |
| SE7 | `GET /sellers/admin/list/` · `GET/PATCH/DELETE /sellers/admin/<id>/` · `GET /sellers/admin/<id>/documents/` · `PATCH /sellers/admin/documents/<doc_id>/` | IsStaff | paths kept for `Stores-Admin/src/pages/admin/SellerManagement/index.tsx`. PATCH allows `verification_status, is_active, is_accepting_orders, verification_notes, commission_rate`. DELETE → soft (`is_active=False`). Verify → `is_verified`, `verification_date`, notify |

Auth changes (same task, `apps/authentication/views.py` only):
- `AdminLoginAPIView` (line ~303) allows `is_staff` **or** an active, non-suspended `seller_profile` (README D5).
- `UserViewSet` (line 83) becomes `ReadOnlyModelViewSet`, with `get_queryset` = self unless `is_staff`. Keep the `me` action.

## §6 Products (`apps/products`)

- `ProductViewSet`: reads AllowAny. Create → IsSeller (`seller_profile` forced to the caller's) or staff. Update/delete → owner seller or staff (object permission). Variants, images, key-features, inventory, discounts → `SellerOwnsProductOrStaff` (checks `obj.product.seller_profile`); create validates that the `product` belongs to the caller.
- New `GET /products/seller/` (IsSeller): my listings, `?status=&q=&low_stock=true&page=`, paginated, with variants (sku, price, quantity).
- New fields `Product.sold_count` PositiveInteger default 0 (incremented by `orders.services.mark_paid` / COD delivery via `F()`) and `Product.free_shipping` Bool default False. One migration.
- `ProductCatalogSerializer` (also used by `merchandising/serializers.py` homepage sections) and `ProductSerializer` expose `sold_count`, `free_shipping`, `seller_verified` (from `seller_profile.verification_status`).
- `GET /products/catalog/` (what FE `store/productSlice.ts` calls) accepts `free_shipping=true` and `seller_verified=true` filters. The response shape is unchanged (still unpaginated; pagination of the public list is P1 together with the FE).

## §7 Disputes (`apps/disputes`, new app, mounted `disputes/`)

Models: `Dispute(order FK, buyer FK, seller FK, reason: not_received|not_as_described|damaged|wrong_item|other, desired_resolution: refund|return_refund|replacement, description, status, refund_amount Decimal null, resolution_note, escalated_at, resolved_at, created_on)` with `UniqueConstraint(order, condition=status in open states)`. `DisputeMessage(dispute FK, author FK, role: buyer|seller|admin, body, attachment File null, created_on)`.

| From | Event | Actor | To |
| --- | --- | --- | --- |
| — | open (order Shipped/Delivered; ≤ 30d after delivery or ≤ 45d after ship) | buyer | open |
| open | first seller message | seller | seller_responded |
| open / seller_responded | seller accepts `{refund_amount ≤ paid − refunded}` | seller | refund_pending |
| open / seller_responded | escalate (seller responded or 72h elapsed) | buyer | escalated |
| escalated | decide refund `{amount}` / reject | admin | refund_pending / closed_no_refund |
| refund_pending | mark refunded `{reference}` → `orders.record_refund` + `Refund` row | admin | refunded |
| open / seller_responded | withdraw | buyer | cancelled |

Endpoints: `GET/POST /disputes/` (buyer, mine); `GET /disputes/<id>/` (buyer, seller of the order, or staff); `POST /disputes/<id>/messages/` (participants; multipart); `POST /disputes/<id>/escalate/`, `/withdraw/` (buyer); `GET /disputes/seller/`, `POST /disputes/seller/<id>/accept/` (IsSeller); `GET /disputes/admin/`, `POST /disputes/admin/<id>/decide/`, `/mark-refunded/` (IsStaff). All state changes lock the dispute row and are idempotent on the target state.

## §8 Cart, addresses, notifications

- **Cart** (`apps/cart`, first migration): router `cart-items/` matching the FE contract (`store/cartSlice.ts`). `POST {cart_id, product_id, product_variant_id, quantity}` (the cart must be mine; merge quantities for the same variant), `DELETE cart-items/<id>/`, `PUT cart-items/<id>/update_item_quantity/ {quantity}`. IsAuthenticated, scoped to `cart__user`.
- **Addresses**: mount the existing `apps/users/address_urls.py` at `addresses/` (BE-0). The WIP view is used as-is.
- **Notifications** (`apps/notifications`): model `Notification(user, kind, title, body, link, data JSON, read_at null, created_on)`. `services.notify()` (§0). Endpoints: `GET notifications/` (mine, paginated), `POST notifications/<id>/read/`, `POST notifications/read-all/`, and a real `unread_count/` (keep the existing path).

---

## Tasks

| ID | Owner | Files (exclusive) | Depends | Acceptance |
| --- | --- | --- | --- | --- |
| **ENV-0** | user / orchestrator | `Stores-BE/venv` | — | Python 3.11 venv; `pip install -r requirements.txt`; local Postgres + Redis; `python manage.py check` runs (README D1) |
| **WIP-0** | user | commit WIP in `apps/orders/models.py`, `apps/users/{models,serializers,address_views,address_urls}.py` as-is | — | `git status` clean for those paths (README D12) |
| **BE-0** | be-builder | `Stores-BE/backend/settings.py`, `backend/urls.py`, `Procfile`, `apps/core/{pagination,permissions,idempotency,errors}.py` (new), `apps/core/models.py` (**remove the two `print`s only**), scaffolds: `apps/auctions/{__init__,apps,models,urls,admin}.py`, `apps/rfq/{...same}`, `apps/disputes/{...same}`, empty `urls.py` in `apps/orders`, `apps/cart`, `apps/payments` | ENV-0 | `check` clean; settings: `INSTALLED_APPS += auctions, rfq, disputes`; `CORS_ALLOW_HEADERS += "Idempotency-Key", "idempotency-key"`; throttle rates `bids: 30/min`, `auction_poll: 120/min`; `CELERY_BEAT_SCHEDULE` (auctions.sweep_auctions 30s, rfq.sweep_rfqs 300s, orders.expire_unpaid_orders 300s); `CELERY_BROKER_TRANSPORT_OPTIONS={"visibility_timeout":3600}`; env `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `FRONTEND_URL`. URLs: `auctions/`, `rfq/`, `orders/`, `disputes/`, `addresses/`, `""→apps.payments.urls`, `""→apps.cart.urls`. Procfile adds `beat: celery -A backend beat -l INFO`. `GET /tradehut/api/v1/addresses/` → 401 when anonymous |
| **BE-ORD-1** | be-builder | `apps/orders/{models.py (additive), services.py, serializers.py, views.py, urls.py, tasks.py, admin.py}`, `apps/orders/migrations/0002_*.py`, `apps/orders/tests/*`, `apps/shipments/{models.py, admin.py}`, `apps/shipments/migrations/0001_initial.py` | BE-0, WIP-0 | one migration per app (includes the WIP fields); tests: each §1 transition, stock decrement/restore, `uniq_order_per_source`, seller scoping (seller B → 404), `expire_unpaid_orders` both branches; O1–O10 per contract. `create_order_for_auction/rfq` + `price_order_for_payment` exist with the §2 signatures |
| **BE-NTF-1** | be-builder | `apps/notifications/{models.py, services.py, views.py, urls.py, admin.py}`, `apps/notifications/migrations/0001_initial.py`, `apps/notifications/tests.py` | BE-0 | `notify()` never raises (test with a broken input); unread_count is real |
| **BE-SEL-1** | be-builder | `apps/sellers/{models.py, serializers.py (new), views.py, urls.py, services.py (new), admin.py (new)}`, `apps/sellers/migrations/0003_*.py` (+ data migration for the group), `apps/sellers/tests.py`, `apps/authentication/views.py` (two blocks in §5 only) | BE-0 | SE1–SE7 per contract; seller user logs in via `auth/admin-login/` → 200; buyer → 403; `/auth/users/` lists only self for non-staff; Admin `SellerManagement` list loads |
| **BE-PRD-1** | be-builder | `apps/products/{views.py, serializers.py, urls.py, models.py, permissions.py (new)}`, `apps/products/migrations/0004_*.py`, `apps/products/tests/*` | BE-0 | anonymous POST/PATCH/DELETE `/products/` → 401; seller A PATCH on seller B's product → 403/404; seller creates product + variant + image; `GET /products/seller/` paginated; `sold_count`, `free_shipping`, `seller_verified` present in `/products/catalog/` and `homepage/sections/` products; `?free_shipping=true&seller_verified=true` filters work |
| **BE-USR-1** | be-builder | `apps/users/serializers.py` (`OrderSerializer` source `"orderitem_set"` → `"items"`), `apps/users/views.py` (prefetch `"orderitem_set"` → `"items"`) | WIP-0 | `GET users/<id>/my_orders/` 200 with items |
| **BE-CART-1** | be-builder | `apps/cart/{models.py (no field changes), serializers.py (new), views.py (new), urls.py}`, `apps/cart/migrations/0001_initial.py`, `apps/cart/tests.py` | BE-0, README D6 | FE add/update/remove against `cart-items/` → 201/200/204; another user's item → 404 |
| **BE-PAY-1** | be-builder | `apps/payments/{models.py, paystack.py, services.py, serializers.py, views.py, urls.py, admin.py}`, `apps/payments/migrations/0001_initial.py`, `apps/payments/tests/{test_checkout,test_webhook,test_pay_order}.py` | BE-ORD-1, BE-PRD-1 (sold_count, free_shipping), README D3/D6 | P1–P5 + O3 per contract (O3's view lives in orders; PAY-1 provides `start_payment(session)` which the O3 view calls, so the O3 view is wired in BE-ORD-1 against a stub signature, then completed here). Tests: replay returns the same session; out_of_stock rollback; **concurrent checkout of the last unit by two users → one success, one 409** (Postgres); webhook bad signature 401; duplicate webhook no-op; amount mismatch → needs_review; webhook after expiry → needs_review. Paystack is mocked in tests; manual test-mode run documented |
| **BE-PAY-2** | be-builder | `apps/payments/{services.py, views.py, urls.py, serializers.py}` (append), `apps/payments/migrations/0002_*.py` if needed, `apps/payments/tests/test_payouts.py` | BE-PAY-1, BE-DSP-1 (open-dispute exclusion) | balance math tests (COD netting, hold days, refunds, disputes); **concurrent payout requests exceeding the balance → one succeeds**; P6–P8 |
| **BE-DSP-1** | be-builder | `apps/disputes/*` (models, migrations/0001, services, serializers, views, urls, admin, tests) | BE-ORD-1 | each transition; eligibility windows; participant-only access; `record_refund` updates the order |

FE tasks (Stores-FE; all: `npm run build` + `npm run lint` pass, no antd in touched files, loading/empty/error states, 375/768/1024/1440, Kinetic tokens stripped from every owned file (rg check in `30-fe-kinetic-migration.md`), UI built from `components/common/marketplace/*`):

| ID | Owner | Files (exclusive) | Depends | Acceptance |
| --- | --- | --- | --- | --- |
| **FE-LINT-0** | fe-builder | `Stores-FE/.eslintrc.json` (new: `{"extends": "next/core-web-vitals"}`) | — | `npm run lint` runs non-interactively; report the existing error count (fixing pre-existing errors is out of scope except in files a task owns) |
| **FE-CHK-1** | fe-builder | `Stores-FE/app/checkout/page.tsx`, `app/checkout/complete/page.tsx` (new), `lib/checkoutApi.ts` (new), `store/checkoutSlice.ts` (remove dead `/api/checkout/*` thunks) | BE-PAY-1, FE-ADDR-1 (address picker shares `lib/addressesApi.ts`, import only) | Real addresses; P2 quote replaces the local math (FX quote stays display-only); P1 with a `crypto.randomUUID()` key per submit; redirect to `authorization_url`; `/checkout/complete?reference=` polls P5 and shows the orders. `?order=<id>` mode pays an auction/RFQ order via O3. 409 out_of_stock / price_changed render inline |
| **FE-ADDR-1** | fe-builder | `Stores-FE/app/account/addresses/page.tsx`, `lib/addressesApi.ts` (new) | BE-0 | CRUD + set default against `addresses/` |
| **FE-ORD-1** | fe-builder | `Stores-FE/app/account/orders/page.tsx`, `app/account/orders/[id]/page.tsx`, `lib/accountApi.ts` (orders part → `/orders/`), `lib/mapOrderFromApi.ts`, `lib/ordersApi.ts` (new) | BE-ORD-1 | list with status tabs; detail with timeline + tracking; cancel (Pending); confirm delivery (Shipped); "Pay now" for due orders |
| **FE-DSP-1** | fe-builder | `Stores-FE/app/account/disputes/page.tsx`, `lib/disputesApi.ts` (new) | BE-DSP-1 | open dispute from an eligible order, message thread with upload, escalate/withdraw |
| **FE-CART-1** | fe-builder | `Stores-FE/store/cartSlice.ts` | BE-CART-1 | no silent local fallback on 4xx/5xx (show an error toast); logged-in add/update/remove hit `cart-items/` |
| **FE-SELL-1** | fe-builder | `Stores-FE/app/sell/page.tsx`, `lib/sellerOnboardingApi.ts` (new) | BE-SEL-1 | logged-in user submits SE1 → success screen with a link to the Admin seller login (`NEXT_PUBLIC_ADMIN_URL`) |
| **FE-SRCH-1** | fe-builder | `Stores-FE/app/search/page.tsx` | — (uses existing `lib/searchClient.ts`, import only) | the `PRODUCTS` mock is removed; results, facets and pagination come from `search/`; empty/error states |
| **FE-PDP-1** | fe-builder | `Stores-FE/app/products/[id]/page.tsx` | — (imports `recordRecentlyViewed` from `components/Home/homeProduct.ts`, import only; that file is owned by the in-flight Home work) | calling it once per product load (after the product resolves) shows the product in the home "Recently viewed" row; no antd added |
| **FE-PLP-1** | fe-builder | `Stores-FE/app/products/ProductsPageClient.tsx`, `store/productSlice.ts` (`fetchProducts` accepts filter params) | BE-PRD-1 | `FilterState.freeShipping` / `verifiedSellerOnly` (from `components/Products/ProductFilters.tsx`, import only) map to `free_shipping=true` / `seller_verified=true` on `/products/catalog/`; toggling refetches |
| **FE-DEALS-1** | fe-builder | `Stores-FE/app/deals/page.tsx` | BE-PRD-1 (sold_count) | No new endpoint: render the `section_type == "flash_sale"` sections from `GET homepage/sections/` (countdown from `ends_at`, sold bar from `sold_count`) using `components/common/marketplace/*`. Empty state when there are no live flash sections |

Admin tasks (Stores-Admin; all: shadcn from `@/components/shadcn` only (see `Stores-Admin/docs/ui-system.md`; use `data-table`, `stat-card`, `page-header`, `empty-state`), **`npx tsc --noEmit` shows no errors in touched files and the total does not rise above the 858 baseline**, `npm run build` passes, tables server-paginated → cards under `md`, sticky mobile action bar on forms, Kinetic classes stripped from every touched file per `30-fe-kinetic-migration.md`):

| ID | Owner | Files (exclusive) | Depends | Acceptance |
| --- | --- | --- | --- | --- |
| **ADM-0** | admin-builder (**DONE**) | `components.json`, `src/lib/utils.ts`, `src/components/shadcn/*`, `tailwind.config.cjs`, `src/tailwind.css`, `tsconfig.json`, `vite.config.ts`, `package.json`, `src/components/Layouts/DefaultLayout.tsx` | — | deps in `package.json` (tailwind-merge, cva, tailwindcss-animate, radix, sonner, tanstack table, rhf, zod); tsc + build pass |
| **ADM-S0** | admin-builder | `src/router/routes.tsx` (**register only**), `src/components/Layouts/Sidebar.tsx` (seller section, `allowedGroups:['Sellers']`, Kinetic stripped), `src/components/Layouts/DefaultLayout.tsx` (mount `<Toaster />` from `@/components/shadcn/sonner` once — the only Toaster mount), placeholders `src/pages/seller/{overview,listings,orders,auctions,rfq,payouts,disputes,settings}/index.tsx`, `src/pages/admin/payouts/index.tsx` placeholder | ADM-0, BE-SEL-1 | seller user logs in and sees only the seller menu; `/seller/*` routes guarded by `ProtectedRoute allowedGroups={['Sellers']}`; staff unaffected |
| **ADM-OVR** | admin-builder | `src/pages/seller/overview/*`, `src/services/sellerStatsService.ts` | ADM-S0 | SE4 + P6 cards; reuse the chart lib already imported by `pages/admin/AdminDashboard.tsx` |
| **ADM-LST** | admin-builder | `src/pages/seller/listings/*` (table + create/edit wizard: details → variants/stock → images → shipping (`free_shipping`) → review), `src/services/sellerListingsService.ts` | ADM-S0, BE-PRD-1 | seller creates a product with 2 variants + images; low-stock filter; cannot open another seller's product |
| **ADM-ORD** | admin-builder | `src/pages/seller/orders/*`, `src/services/sellerOrdersService.ts` | ADM-S0, BE-ORD-1 | list/detail, ship with tracking, cancel, COD confirm delivery |
| **ADM-PAY** | admin-builder | `src/pages/seller/payouts/*`, `src/services/sellerPayoutsService.ts` | ADM-S0, BE-PAY-2 | balance, history, request payout (Idempotency-Key), error states for 409s |
| **ADM-DSP** | admin-builder | `src/pages/seller/disputes/*`, `src/services/sellerDisputesService.ts` | ADM-S0, BE-DSP-1 | thread, reply, accept refund |
| **ADM-SET** | admin-builder | `src/pages/seller/settings/*`, `src/services/sellerProfileService.ts` | ADM-S0, BE-SEL-1 | profile, policies, bank details (masked), documents upload, accepting-orders toggle |
| **ADM-A-ORD** | admin-builder | `src/pages/admin/OrderManagement/index.tsx` | Phase 1 done on this file, BE-ORD-1 | uses O10; filters; cancel / confirm delivery |
| **ADM-A-SEL** | admin-builder | `src/pages/admin/SellerManagement/index.tsx`, `src/pages/admin/SellerProfile.tsx` | BE-SEL-1 | verify/reject/suspend, commission, documents review |
| **ADM-A-DSP** | admin-builder | `src/pages/admin/disputes/{DisputeManagement,DisputeDetail}.tsx` | BE-DSP-1 | decide + mark refunded against §7 |
| **ADM-A-PAY** | admin-builder | `src/pages/admin/payouts/*` | ADM-S0, BE-PAY-2 | P8 queue: mark processing/paid/failed |

## Risks
- **Uncommitted WIP** in orders/users: BE-ORD-1/BE-USR-1 must build on it. Migration `orders/0002` will include the WIP fields, so commit WIP first (WIP-0).
- **Missing migrations for cart/payments/shipments**: if the production DB already has these tables (created outside migrations), a plain `migrate` fails. `--fake-initial` needs user approval (README D6). BE builders must not run `--fake`.
- **Money**: stock lock order (sorted variant ids) prevents deadlocks; Paystack amount/currency verified server-side; webhook signature mandatory; late payment after expiry → `needs_review`, never silently revived.
- **Payout double-spend**: SellerProfile row lock + recompute inside the lock.
- **Permissions**: the product write lock-down may break Admin `AddProduct.tsx` for staff without `seller_profile`. Staff keep full write access by design. Check `AddProduct` sets `seller_profile` explicitly.
- **AdminLogin change** widens Admin access to sellers. Every `/admin/*` route already requires staff groups, but BE endpoints must enforce `IsStaff` themselves (never rely on FE groups).
- Promo redemption is not reversed on cancel (P1). Usage counts may over-count abandoned online checkouts.

## Addendum — found by the all-products page rework (FE)
`GET /products/catalog/` takes **no parameters and returns the whole catalogue**; `/products` therefore filters, sorts and paginates in the browser. This does not scale past a few thousand products. Extend **BE-PRD-1** with a server-side listing: params `page`, `page_size`, `search`, `category`, `subcategory`, `ordering`, `min_price`, `max_price` (on the price the buyer pays), `free_shipping`, `verified_seller`, `in_stock`; response `{count, next, previous, results}`; rows include `final_price`, `sold_count`, `free_shipping`, `seller_verified`, `rating`, `review_count`. Index the filtered columns and avoid N+1 (`select_related`). Then **FE-PLP-1** switches `ProductsPageClient` to server pagination (read/write `?page`, `?sort` in the URL).

## Addendum — HIGH risk found by the wave-1 reviewer (BE-ORD-1 must handle)
The committed WIP in `Stores-BE/apps/orders/models.py` removes the `address_id` IntegerField and repoints FK `address` to `db_column='AddressID'`. A plain `makemigrations` would produce "Remove field address_id / Add field address", i.e. **drop and re-add column `AddressID`, losing every existing order→address link**, and the FK constraint would fail on orphan ids. Also pending (from `makemigrations --check`): `users` Address fields (full_name, is_default, label, phone) and 7 more `orders` fields.
Required: **do not run makemigrations blindly.** be-builder hand-writes the orders migration with `SeparateDatabaseAndState` (state: remove + add FK; database: `AlterField` converting the existing `AddressID` column to the FK after nulling/repairing orphan ids), with a test that existing rows keep their address link. Reviewer must approve the migration before it is applied anywhere; take a prod DB backup before migrating.

## Addendum — found by the public seller store page (FE)
- SE6 (`GET /sellers/<slug_or_uuid>/`, AllowAny) is what `Stores-FE/app/seller/[id]` calls; until BE-SEL-1 lands the store shows a generic "Seller store" header with products only. Its serializer must expose: name, description, logo, banner, slug, rating, review_count, order_count, is_verified, is_accepting_orders, return_policy, shipping_policy, website/social. The dead `SellerProfilePublicSerializer` (Meta.model=None) and `apps/users/seller_views.py` imports of `SellerProfile` from `.models` are broken; BE-SEL-1 replaces them (Phase 5 deletes the dead files).
- BE-PRD-1 additionally: `?seller_profile=<id>` filter + hide statuses Deactivated/Archived/Deleted/Pending/Draft/Suspended on the public list; pagination. Reviews: `?seller_profile=<id>` with pagination and per-seller average/count.
- Not available and deliberately not shown: city/region, member-since (`BaseModel.created_at` is `auto_now` = last-modified, see D7), followers, response rate, shipping time.
- **FE bug (assign to FE-PDP-1):** `app/products/[id]/page.tsx` links to `/seller/${productDetail.seller.id}` and reads `productDetail.seller.username`, but `Product.seller` is a plain user id and `seller_profile` is the SellerProfile id → link becomes `/seller/undefined` and `.username.charAt` can crash. Link to `/seller/${product.seller_profile}` and guard missing fields.

## Addendum — contract amendment (orchestrator decision, from ADM-OVR)
**SE4** `GET /sellers/me/stats/` gains `sales_by_day: [{date: "YYYY-MM-DD", total: "<money string>"}]` — the last 30 days, one entry per day including zero days, computed with a single DB aggregate (`TruncDate` + `Sum` over paid orders for this seller). The Overview chart renders only when this field is present. Also: `GET orders/seller/` default ordering is newest first (`-placed_at`). Login redirect: users in the `Sellers` group with no staff signal go to `/seller/overview` (FE `pages/auth/login.tsx` and `components/Auth/AuthRedirect.tsx`); BE profile must expose `groups` and `is_staff`/`is_superuser`.

## Addendum — contract clarifications required by the seller Orders UI (BE-ORD-1 must satisfy)
The FE (`Stores-Admin/src/pages/seller/orders`, `services/sellerOrdersService.ts`) reads these; make the O1/O6–O9 serializers return exactly them:
- OrderRow/OrderDetail: `pay_mode` (`"COD"` | `"ONLINE"`) — without it COD orders look unpaid and the "cash collected" action never appears.
- `buyer_name` (string) on list rows and detail; shipping address under the single key `shipping_address` with `{full_name, phone, address, address_line2, city, state, postal_code, country}` (snapshot at order time).
- Totals: `net_amount` and `commission_amount` (seller view only).
- `timeline[]` of `{status, at}` entries (placed/paid/shipped/delivered/cancelled).
- O6 supports `ordering` (`placed_at`, `total_amount`, `-…`), `status` (single value: Pending|Processing|Shipped|Delivered|Cancelled|Refunded), `q` (order id / item title / buyer name), `page`, `page_size`.
- Cancel body `{reason}`: FE sends 3–200 chars; `Order.cancel_reason` is `Char(64)` → widen the column (or store full text in a new field) in the hand-written orders migration.
- Seller landing: Overview "Orders to ship" card should link `/seller/orders?status=Processing`.

## Addendum — what the seller Listings UI (ADM-LST) needs from BE-PRD-1
- Sellers must be able to write variants and images for their OWN products: today `apps/products/views.py:404-450` uses `StaffWritePermission` (seller writes → 403) and `ProductViewSet` (`views.py:287-295`) has no `permission_classes` / seller scoping (open-write hole, audit #1). Add `IsSellerOwner` object permission on product/variant/image writes; force `seller_profile` server-side.
- `GET products/seller/` params: `page, page_size, q, status, low_stock=true (quantity ≤ 5), ordering (name, -updated_at, price)`; rows include `updated_at, free_shipping, category_name, pricing_currency, primary_sku, primary_variant_price, variant_stock_total, variants[{id,sku,price,quantity,name}]`.
- Owner can retrieve their own Draft/Archived products (`GET products/<id>/`, `variants/`, `images/`) — public hiding of those statuses must not break the editor.
- Add model fields: `ProductVariant.compare_at_price` (nullable), `ProductImage.position` (int) so image order persists, `Product.free_shipping`; weight/dimensions only if shipping rates need them. `ProductImage.product_variant` is a required FK (`models.py:328-360`) — consider making it nullable so product-level images aren't anchored to variant 1.
- DRF field-level 400s for SKU uniqueness (`sku` key), price/quantity bounds. Image limits (client uses 5 MB × 10, jpg/png/webp) — enforce server-side too.
- Delete of a variant cascades its images; FE moves images first.

## Addendum — Seller self-onboarding with KYC (USER DECISION; supersedes the "call us" stopgap on /sell)
Sellers apply online; staff approve. Flow: user account → **Sell on TradeHut** → application form (business details + KYC) → status `pending` → staff review in Admin → `verified` | `rejected`. A seller may sign in to the seller dashboard as soon as they apply (so they can prepare listings), but **their products are not public until verified**.
- **Statuses** (`SellerProfile.verification_status`): `pending` (default on apply), `verified`, `rejected` (+ `verification_notes` shown to the seller as the reason), `suspended`. `is_verified` stays in sync (`True` only for `verified`). Public visibility requires `verification_status == "verified"` AND `is_active`.
- **SE1** `POST /sellers/onboarding/` (IsAuthenticated; 409 `already_seller`): `{business_name, business_type: "individual"|"registered_business", business_description?, business_email, business_phone, business_address, business_registration_number? (required if registered_business), tax_id?, id_type: "ghana_card"|"passport"|"drivers_licence"|"voters_id", id_number, accept_terms: true}` → 201 profile with `verification_status:"pending"`. Adds the user to Group `Sellers`. Store `id_type`/`id_number` (new SellerProfile fields; never returned in public serializers; masked in seller view: last 4). Phone validated as a Ghana mobile.
- **SE3** `POST /sellers/me/documents/` (multipart; ≤ 10MB pdf/jpg/png) kinds: `id_card` (front), `id_card_back`, `selfie_with_id` (optional), `proof_of_address`, `business_registration` (required for registered_business). Application is **reviewable only when the required documents exist**; SE2 returns `missing_documents: [kind…]` and `can_resubmit` (true when rejected).
- **SE2** `GET /sellers/me/` returns `verification_status`, `verification_notes` (only when rejected), `missing_documents`, `documents[{kind,status,note}]`, profile fields, `id_number_last4`. 404/403 with code `not_a_seller` when the user has no profile. `PATCH` allowed while pending/rejected; a rejected seller who PATCHes or uploads moves back to `pending` (re-application) via `POST /sellers/me/resubmit/`.
- **SE7** staff: approve (`PATCH …/admin/<id>/ {verification_status:"verified"}`) sets `is_verified`, `verification_date`; reject requires `verification_notes` (min 10 chars); both notify the seller (notification + email) and are audit-logged.
- **Product visibility (BE):** every PUBLIC product query (catalog, list, retrieve, search indexing, homepage sections, seller store) excludes products whose seller is not `verified`+`is_active`. The owner and staff still see/edit them. Orders/checkout must refuse items from non-verified sellers. Unverified sellers cannot create auctions or submit RFQ quotes.
- **FE:** `/sell` = real application form (sign-in gate, multi-step: Business → Identity (KYC) → Documents → Review/Terms) and status screens (pending / rejected-with-reason-and-resubmit / verified → "Go to my store"). Header + account menu + mobile drawer show **My store** for users with a seller profile (link = `${NEXT_PUBLIC_ADMIN_URL}/seller/overview`). Seller dashboard shows a persistent top banner while not verified: "Your store isn't verified yet — your products won't be live until it is verified." (variants for pending/rejected/suspended). Do not invent review timelines or approval promises.
- **Admin (staff):** SellerManagement shows the application queue (filter by status), documents viewer (signed/protected URLs), approve / reject-with-reason actions (ADM-A-SEL).

## Addendum — onboarding contract clarifications (orchestrator decisions, from the Admin Settings builder)
- **SE3 multipart fields:** `kind` (one of the document kinds) and `file`. Re-uploading a kind replaces the previous document of that kind (old one kept as history, status `pending`).
- **SE2 `GET sellers/me/` must return:** `business_type`, `id_type`, `id_number_last4`, `verification_status`, `verification_notes`, `missing_documents[]`, `can_resubmit`, `documents[{kind,status,note,uploaded_at}]`, plus profile fields (`business_name, business_description, business_email, business_phone, business_address, return_policy, shipping_policy, is_accepting_orders`). Required document kinds: `id_card`, `proof_of_address`, and `business_registration` when `business_type=registered_business`; `id_card_back` is required for two-sided ID types (ghana_card, drivers_licence, voters_id), optional for passport; `selfie_with_id` optional. `missing_documents` is computed from these rules.
- **Status transitions:** `PATCH` and document uploads never change `verification_status`. `POST /sellers/me/resubmit/` is the only way back to `pending` (allowed from `rejected` only; 400 `missing_documents` if required docs are absent). A `pending` seller may PATCH/upload freely (the application is still unreviewed).
- **Verified seller edits:** may PATCH `business_description, return_policy, shipping_policy, is_accepting_orders, business_email`; changing identity fields (`business_name, business_phone, business_address, business_registration_number, tax_id, id_*`) is rejected with 400 `identity_locked` (they contact support / staff edit). Suspended sellers are read-only.
- Logo/banner upload (`store_logo`, `store_banner`) is added to SE2 as multipart PATCH fields (Settings UI follows in ADM-SET).

## Addendum — found by the cart/ads rework (BE-CART-1 / BE-PRD-1 must satisfy)
- **Logged-in cart rows are unusable:** `GET users/<id>/my_cart/` returns flat rows (`product` = UUID, `product_name`, `quantity`) with no price, image or stock, so a signed-in user's cart shows "Price at checkout" and no image. BE-CART-1 must return the same nested shape the guest cart uses: `items[{id, quantity, product{id,name,main_product_image,final_price,price,discount_percentage,inventory_level,available,store_name,seller_profile,free_shipping}, variant{id,name,sku}, line_total}]` plus `item_count`, `subtotal`, `currency`. Guest cart rows (`store/cartSlice.ts`) should also carry `inventory_level`, `available`, `store_name`.
- **Catalog/list rows** need `free_shipping`, `sold_count`, `inventory_level`/`stock_left` (0 only when tracked and out of stock — never 0 for untracked), `store_name`, `arrival_text` so the new product-card lines light up (FE already passes them through when present).
- **FE follow-ups (small):** `app/page.tsx` should pass `priority` to the first `nav-banner` AdSlot; `components/Layouts/MainLayout.tsx` footer banner wrapper (`container mx-auto px-4 mb-6`) leaves ~24px margin when no ad; `tsconfig.tsbuildinfo` is tracked and changes on every `tsc` run → untrack and gitignore it.

## Addendum — "What do you sell?" becomes a category picker (USER DECISION; avoids free-text typos)
- **Model (`apps/sellers`):** `SellerProfile.selling_categories` = ManyToMany → `catalog.Category` (blank=True), plus `other_category` CharField(max_length=80, blank=True) for sellers whose category isn't listed. Keep `business_description` as an OPTIONAL "Tell buyers about your store" blurb (no longer the "what do you sell" answer).
- **Rules (SE1 onboarding + SE2 PATCH):** body fields `selling_categories: [category uuid]` (existing, active categories only; max 10; duplicates ignored) and `other_category: string`. Validation: at least one category OR a non-empty `other_category` is REQUIRED on onboarding (400 `{selling_categories: "Choose at least one category or describe it under Other."}`); `other_category` is trimmed, collapsed whitespace, 3–80 chars, letters/digits/space/&/-/, only (no URLs/emails/HTML); unknown ids → 400. Sellers may edit both after onboarding (not identity-locked). Unchanged by status machine.
- **Responses:** SE2 (seller) and staff detail return `selling_categories: [{id, name}]` and `other_category`. Staff list rows return `selling_categories` names (compact) so reviewers see them in the queue. Public profile returns the category `{id, name}` list only (never the free `other_category` text).
- **Admin signal:** staff can see `other_category` text in the review sheet to decide whether to ask the catalog team to add a new category (no automatic creation).
- **RFQ matching (D8 update):** supplier ↔ RFQ matching uses `selling_categories` ∪ categories of the seller's active listings.
- **FE:** application form step 1 'Business': required multi-select chip picker (searchable, grouped alphabetically, max 10 selected, selected chips removable) from `catalog/categories/` plus an 'Other' chip that reveals a short text input; helper text 'Pick everything you sell — you can change this later'. Seller Settings → Store profile: the same picker, editable. Staff review sheet: shows chips + the Other text.

## Addendum — product card data needs (from the card redesign)
- Product list/catalog/search/homepage serializers must expose `images: [url, url]` (main + one alternate, absolute URLs, max 2) or `second_image`, so cards can crossfade on hover; plus `rating`/`average_rating`, `total_reviews`, `free_shipping`, `sold_count`, `stock_left`/`inventory_level`, `store_name`, `seller_profile`. Without these the card shows only image, price and title (no blank strips once the grid uses `compactEmptyMeta`). `HomeProduct` (components/Home/homeProduct.ts) and `toCardProduct` (ProductsPageClient, search) must pass them through when present.

## Addendum — checkout contract decisions required by the rebuilt FE (BE-ORD-1 / BE-PAY-1 / BE-CART-1 must satisfy)
The FE (`Stores-FE/lib/checkoutApi.ts`, `app/checkout/**`, `lib/addressesApi.ts`) is written to these; freeze them:
1. **P2 `POST checkout/quote/` response (CartQuote):** top-level `{currency, subtotal, shipping_cost, tax_amount, promo_discount, total_amount, orders:[{seller,…same money fields}], lines:[{variant_id, quantity, unit_price, line_total, available_quantity?, error?}]}` (all money as decimal strings). 409 `price_changed` returns `extra.quote` in the same shape.
2. **P1 `POST checkout/`:** `{checkout_id, status, payment:{provider, authorization_url, reference}, orders:[…]}`; COD → `payment.provider="cod"`, no URL; replay of an already-paid session → 200 with `status:"paid"` and the same body (never a second charge).
3. **P5 `GET payments/paystack/verify/?reference=`** must accept either the Paystack reference OR the checkout session id (`reference = session.id.hex`) and return `status` ∈ `paid | pending | failed | expired | needs_review | cod` plus `orders:[{id, order_status, payment_status}]`. (Or add `GET checkout/<id>/`.)
4. **O2 order detail** keys for totals: `subtotal`, `shipping_cost`, `tax_amount`, `promo_discount`, `total_amount`, `currency`, `payment_due_at`, `pay_mode`, `payment_status`, `order_status` (zeros allowed for unpriced auction/RFQ orders — FE shows "Calculated at checkout"). O3 `POST orders/<id>/pay/` takes `{address_id, delivery_method?}` and prices shipping/tax server-side.
5. **`users.Address.postal_code`** must become `blank=True` (Ghana addresses often have none; FE currently sends "N/A"). Add `landmark`, `region`, `digital_address` (GhanaPost GPS, optional) fields if not present.
6. **COD gateway:** default `StoreConfig.payments_gateways` has paystack/momo/flutterwave only; add a `cod` gateway entry (id `cod`) to the default config + a data migration, so COD appears when an admin enables it. Paystack enabled flag must be read server-side only; the public config must never expose secret keys (audit).
7. **BE-CART-1:** logged-in cart rows must include `variant{id,name,sku}` (P1 needs `variant_id`); guest rows already carry `product_variant_id`.
8. `components/Promo/PromoCodeInput` calls `onChange` from a stale closure (apply never reaches the parent) — FE follow-up (cart uses a new `PromoField`; retire the old one).
