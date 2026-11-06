# 00 — Phase 0 Audit (verified against code, 2026-11-04)

Every claim cites a path. "Verified" = I read the file. Paths are relative to the repo root.

## 0. Working-tree state (do not overwrite)

`git status` shows uncommitted work. Builders must edit **additively** and must not revert, reformat or re-generate these:

| File | Uncommitted change | Effect |
| --- | --- | --- |
| `Stores-BE/apps/orders/models.py` | `Order.address` FK → `users.Address`; `phone` nullable; pricing snapshot fields (`subtotal`, `shipping_cost`, `tax_amount`, `delivery_method`, `promo_code`, `promo_discount`); `OrderItem.order` `related_name='items'`; `OrderItem.variant` FK | **No migration generated yet.** `related_name='items'` breaks `apps/users/serializers.py:334` (`source="orderitem_set"`) and `apps/users/views.py` `my_orders` (`prefetch_related("orderitem_set", ...)`). `/users/{id}/my_orders/` will raise once this is loaded. |
| `Stores-BE/apps/users/models.py` | `Address.label/full_name/phone/is_default` | No migration yet. |
| `Stores-BE/apps/users/serializers.py` | `AddressSerializer.read_only_fields = ["id","user"]` | fine |
| `Stores-BE/apps/users/address_views.py`, `address_urls.py` (untracked) | `AddressViewSet` scoped to `request.user`, `set_default` action | **Not mounted** in `backend/urls.py`. |
| `Stores-Admin/components.json`, `src/lib/utils.ts`, `src/components/shadcn/*`, `tailwind.config.cjs`, `src/tailwind.css`, `tsconfig.json` (paths), `DefaultLayout.tsx` | shadcn setup **in flight** by another agent | `tailwind-merge`/`class-variance-authority` not yet in `package.json` or `node_modules` — `src/lib/utils.ts` will not type-check until deps are installed. Owned by that in-flight task (ADM-0). |
| `Stores-FE/app/page.tsx`, `components/Home/*`, `components/ProductCards/FlashSaleCards.tsx`, `components/Products/ProductFilters.tsx`, `components/common/marketplace/` | Home / filters rewrite **in flight** | Excluded from every task in these plans. |

## 1. Environment

- `Stores-BE/venv` is broken: it points at a removed Windows-Store Python 3.12 (`No Python at ...PythonSoftwareFoundation.Python.3.12...`). Only Python 3.15 is installed system-wide, and Django<6 / torch have no 3.15 support. **`manage.py check` could not be run.** Railway uses Python 3.11 (`Stores-BE/nixpacks.toml`). User needs to install 3.11 and recreate the venv (see README decisions).
- DB is Postgres-only (`backend/settings.py` lines 266–287, no sqlite fallback). That works for `select_for_update` concurrency tests; they need a local Postgres.
- Celery: `backend/celery.py` autodiscovers `apps/*/tasks.py`. `Procfile` runs `web` + `worker` but **no `beat`**, and settings have no `CELERY_BEAT_SCHEDULE`. Broker = Redis (`REDIS_URL`). No `django-celery-beat` (use the built-in scheduler, so no new dependency).
- DRF defaults (`backend/settings.py:382`): `DEFAULT_PERMISSION_CLASSES = AllowAny`, **no default pagination**, JWT auth. `CORS_ALLOW_HEADERS` (line 438) does **not** include `Idempotency-Key`, so browser preflights for idempotent writes will fail.
- `apps/core/models.py` `BaseModel`: `created_at = DateTimeField(auto_now=True)`. **That is a bug**: `created_at` is rewritten on every save, so it cannot be used for ordering or audit. `save()` also `print()`s twice per save.
- `requirements.txt` already has `celery`, `redis`, `stripe`, `requests`, `django-fsm`, `channels` (unused). Paystack needs only `requests`.

## 2(a). Checkout → payment → order (Stores-BE)

| Area | Verified state |
| --- | --- |
| URL mounting | `backend/urls.py`: `orders/`, `cart/`, `payments/`, `shipments/` includes are **commented out**. None of these apps has `urls.py`, `views.py` or `serializers.py`. |
| `apps/cart/models.py` | `Cart(user)`, `CartItem(cart, product, product_variant, selected_variant_configuartion, quantity)`. **No `migrations/` folder**, so `migrate` never creates `carts`/`cart_items` on a fresh DB. Read-only access happens only through `UserViewSet.my_cart` (`apps/users/views.py:128`). |
| `apps/orders/models.py` | `Order` has `ORDER_STATUS` = Pending/Processing/Shipped only (`max_length=10`). It has no payment status, no seller, no currency, no source (cart/auction/rfq), no idempotency, and no timestamps other than BaseModel's. `OrderItem` has no title/sku snapshot. `ReturnRequest(order, product, reason, status free-text)`. One migration: `0001_initial.py`. |
| `apps/payments/models.py` | `Payment(order, payment_date, amount, status max_length=9, payment_method, transaction_id)`, `Refund(return_request, amount)`, `Transaction`, and `PaymentMethod` (**stores `card_number` as CharField**, which is a PCI hazard: never use it). **No `migrations/` folder.** |
| `apps/shipments/models.py` | `ShippingAddress` (duplicates `users.Address`), `Shipment(order, shipping_address, tracking_number, shipping_date, expected_delivery_date)` with no carrier or status. **No `migrations/` folder.** |
| Pricing | `apps/core/views.py` `fx_quote` → `fx_service.quote_checkout_amounts` converts display totals using **floats**. This is display-only and must not be used for charging. No server-side order pricing exists. |
| Promotions | `apps/promotions/services.py` has a usable `validate_promo(code, CartContext, user)`, `redeem_promo(promo, order, user, discount_amount)` (atomic, race-safe) and `commission_basis_amount(...)`. These are ready to call from checkout. |
| Gateways | `apps/store/models.py` `StoreConfig.payments_gateways` JSON defaults: Paystack (enabled), MoMo (enabled), COD (enabled), Stripe/PayPal/Flutterwave disabled. **Secret keys live in this DB JSON** and are returned to staff by `GET store/config/`. No gateway code exists anywhere. |
| Shipping/tax config | `StoreConfig.shipping_methods` (id/name/rate/enabled), `shipping_free_threshold`, `tax_mode`, `tax_default_rate`, `tax_country_rates`, `tax_charge_on_shipping`, `currency_base="GHS"`. Exposed publicly via `store/config/public/`. |
| Addresses | `AddressViewSet` exists (untracked) but is **not mounted**. |

**What Stores-FE checkout calls** (`Stores-FE/app/checkout/page.tsx`, 1378 lines):
- Addresses and payment methods come from `MOCK_ADDRESSES` / `MOCK_PAYMENT_METHODS` (line 123).
- `handlePlaceOrder()` (line 1168) is `alert("Order placed! (Integration pending)")`. **No order is ever created.**
- Real calls: `POST core/fx/quote/` (display totals) and, for buy-now, `GET /products/{id}/` + `/products/{id}/variants/`.
- `store/checkoutSlice.ts` posts to `/api/checkout/initialize` and `/api/checkout/process` using bare `axios`. These endpoints do not exist (dead code).
- `store/cartSlice.ts`: logged-in cart calls `POST cart-items/`, `DELETE /cart-items/{id}/` and `PUT /cart-items/{id}/update_item_quantity/`. None of these exist. On any non-401 error it **silently falls back to localStorage**, so logged-in users effectively have a local cart. `GET users/{id}/my_cart/` exists.
- Account: `app/account/orders/page.tsx` uses `getMyOrders` → `users/{id}/my_orders/`, which will break with the WIP related_name. `app/account/orders/[id]/page.tsx` uses demo data. `app/account/addresses`, `payment-methods`, `disputes`, `bids` and `requests` are all mock (`TODO` comments).

## 2(b). Seller side

| Area | Verified state |
| --- | --- |
| `apps/sellers/models.py` | `SellerProfile` is complete enough: business info, bank fields, `verification_status` (pending/verified/rejected/suspended), `is_verified`, `commission_rate` (default 10.00), `is_active`, `is_accepting_orders`, `store_slug`, metrics. No document model and no category scope. |
| `apps/sellers/urls.py` / `views.py` | Mounted at `sellers/`. The only endpoint is `SellersListView`, a **placeholder** returning `{"results": [], "count": 0}`. |
| `apps/users/seller_views.py` + `seller_urls.py` | A full seller API (become-seller, profile, stats, documents, toggle-orders, admin list/detail). **Dead code**: it imports `SellerProfile, SellerDocument` from `apps.users.models` (neither exists there), plus `SellerProfileSerializer`, `SellerProfileCreateSerializer`, `SellerProfileUpdateSerializer` and `SellerDocumentSerializer` (none exist; `SellerProfilePublicSerializer.Meta.model = None`). It is not mounted anywhere. `SellerStatsView` filters a non-existent `status` field. |
| Seller login to Admin | `apps/authentication/views.py:303` `AdminLoginAPIView` rejects anyone without `is_staff`. **Sellers cannot log into Stores-Admin.** |
| Products API | `apps/products/views.py:35` `ProductViewSet`: `permission_classes` is **commented out**. With the global `AllowAny`, **anonymous users can create, update and delete any product.** Variants, images, inventory, discounts and key-features use `StaffWritePermission` (staff only), so sellers can't add variants. There is no seller scoping and no "my listings" endpoint. List endpoints are unpaginated (`search`, `catalog` return full collections). |
| Product model | `Product.seller_profile` FK, `status` (Active/Draft/...), `ProductVariant(sku unique, price, quantity, min_buy_amount, attribute_values)`, `Inventory(product, quantity_in_stock, restock_date)` (separate and redundant; variant `quantity` is the real stock). No sold counter. |
| Auth | `apps/authentication/views.py:83` `UserViewSet(ModelViewSet)` at `/auth/users/`: `queryset = User.objects.all()` with `IsAuthenticated`. **Any logged-in user can list, edit or delete every user.** |
| Payouts | No model or endpoint. `StoreConfig.payments_min_payout`, `payments_payout_schedule` exist. |
| Disputes/returns | Only `orders.ReturnRequest` (no buyer, no state machine, no endpoints). Admin `pages/admin/disputes/*` call `/disputes/...`, and FE `app/account/disputes` + `app/seller/disputes` are mock. |
| Notifications | `apps/notifications/views.py` `UnreadCountView` returns a hard-coded `{"count": 0}`. No model. |
| Auctions / RFQ | Greenfield. Only `StoreConfig.storefront_show_auctions/rfq`. FE `app/auctions/page.tsx` (783 lines), `app/rfq/page.tsx` (757), `app/account/bids`, `app/account/requests` are static mockups. |

**Stores-Admin pages** (`Stores-Admin/src/router/routes.tsx`, 984 lines; `components/Layouts/Sidebar.tsx`):
- **Admin-only (exist)**: `/admin/dashboard` (EcommerceDashboard), products list/new/detail/edit (`pages/admin/ProductManagement/*`, AddProduct posts to `/products/`, `/products/variants/` etc.), search, merchandising, ads, promos, orders list/pending/completed (`OrderManagement` calls `GET /orders/`, which **404s**), catalog/categories/brands, customers, sellers list/new (`SellerManagement` calls `/sellers/admin/list/` and `/sellers/admin/{id}/`, both **unmounted**, so 404), inventory, users/roles, reviews, revenue/*, pricing, disputes (calls nonexistent `/disputes/`), settings, maintenance, notifications, audit trail.
- **Seller pages: none.** There is no seller route, no `Sellers` group in any `allowedGroups`, and no seller sidebar section. Access control is group-based (`components/Auth/ProtectedRoute.tsx`, `allowedGroups`).
- **Unrelated leftovers** (booking/job/provider/vehicle/service-request): `/service-request*`, `/my-bookings`, `/bookings/*`, `/bidding/:serviceId` (`pages/user/BidSelection.tsx` is *service* bidding, not auctions), `/vehicle-management/*`, `/providers/*`, `/admin/jobs*`, `/admin/bookings*`, `/admin/providers*`, `/admin/drivers/*`, `/admin/revenue/provider-payments`. Delete in Phase 5 after reviewer confirmation.
- Stray backend files in `Stores-Admin/` root: `admin.py`, `models.py`, `views.py`, `urls.py`, and an empty file named `'`. These are untracked junk except `models.py`, which is tracked. Flag for reviewer deletion.
- Charts: Admin has both `react-apexcharts` and `chart.js`. `AdminDashboard.tsx` uses one of them; ADM-OVR must reuse whatever `AdminDashboard.tsx` imports.

## 2(c). P0 launch blockers — ranked

| # | Severity | Gap | Evidence | Fixed by |
| --- | --- | --- | --- | --- |
| 1 | **Security** | Anonymous product create/update/delete | `products/views.py:38` permission commented, global AllowAny | 20 · BE-PRD-1 |
| 2 | **Security** | Any user can list/modify/delete all users | `authentication/views.py:83` | 20 · BE-SEL-1 |
| 3 | **Blocker** | No order, checkout or payment API; FE "Place order" is an `alert` | `backend/urls.py` commented includes; `checkout/page.tsx:1168` | 20 · BE-ORD-1, BE-PAY-1, FE-CHK-1 |
| 4 | **Blocker** | cart/payments/shipments have no migrations, so tables are missing on a fresh DB | no `migrations/` dirs | 20 · BE-CART-1, BE-PAY-1, BE-ORD-1 (+ prod-DB check, README D6) |
| 5 | **Blocker** | WIP `related_name='items'` breaks `my_orders` | `users/serializers.py:334`, `users/views.py` | 20 · BE-USR-1 |
| 6 | **Blocker** | Sellers can't onboard (API dead) or log into Admin; Admin has no seller pages | §2(b) | 20 · BE-SEL-1, FE-SELL-1, ADM-S0.. |
| 7 | **Blocker** | Sellers can't create variants/images; no seller scoping or my-listings | `StaffWritePermission` | 20 · BE-PRD-1, ADM-LST |
| 8 | High | Address book not mounted; FE address/checkout mocked | `address_urls.py` unmounted | 20 · BE-0, FE-ADDR-1 |
| 9 | High | Order status model can't express payment, cancel, deliver, or per-seller | `orders/models.py` | 20 · BE-ORD-1 |
| 10 | High | No seller fulfilment (ship + tracking) or buyer tracking | shipments models only | 20 · BE-ORD-1, ADM-ORD, FE-ORD-1 |
| 11 | High | Auctions, RFQ greenfield | — | 10, 11 |
| 12 | High | No payouts | — | 20 · BE-PAY-2, ADM-PAY |
| 13 | High | No disputes/returns | — | 20 · BE-DSP-1, FE-DSP-1, ADM-DSP |
| 14 | High | Infra: no beat process, CORS lacks `Idempotency-Key`, broken venv | §1 | 20 · BE-0 + README D1 |
| 15 | Med | Search page is static mock data (`app/search/page.tsx:67 PRODUCTS`); home uses `dummyProducts` (home in flight) | | 20 · FE-SRCH-1 |
| 16 | Med | Logged-in cart silently local; cart endpoints missing | `store/cartSlice.ts` | 20 · BE-CART-1, FE-CART-1 |
| 17 | Med | `next lint` stops at an interactive prompt (no `Stores-FE/.eslintrc.json`), so the DoD lint gate can't run | no eslintrc | 20 · FE-LINT-0 |
| 18 | Med | FE flash-sale bars need a sold count; serializers don't expose one (`homeProduct.ts:82` reads `sold_count`) | `products/serializers.py` | 20 · BE-PRD-1 |
| 19 | Med | PDP doesn't record recently viewed (`recordRecentlyViewed` exported at `components/Home/homeProduct.ts:117`) | `app/products/[id]/page.tsx` | 20 · FE-PDP-1 |
| 20 | Med | Gateway secrets stored in DB JSON | `store/models.py` | 20 · BE-PAY-1 reads env (README D3) |
| 21 | Low | `BaseModel.created_at` auto_now; prints in `save()` | `core/models.py` | BE-0 removes prints; created_at → README D7 |
| 22 | Low | Notifications mocked | `notifications/views.py` | 20 · BE-NTF-1 (minimal) |
| 23 | Low | Global `AllowAny` default | settings | Phase 5 (README D10) |
