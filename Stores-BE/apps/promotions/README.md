# Promo Codes — How it runs (a guided tour)

The TradeHut promo code system. Discount codes redeemable on the cart and
checkout, owned **either by the platform** (run by ops/marketing) **or by an
individual seller** (managed in their seller dashboard, applied only to that
seller's products in the cart).

If you only need an inventory of files, jump to
[Where the code lives](#where-the-code-lives) at the bottom.

---

## Table of contents

1. [Mental model in 60 seconds](#mental-model-in-60-seconds)
2. [Glossary](#glossary)
3. [TL;DR — install and seed](#tldr--install-and-seed)
4. [Tutorial — your first code in 3 minutes](#tutorial--your-first-code-in-3-minutes)
5. [The data model](#the-data-model)
6. [Discount types](#discount-types)
7. [Request lifecycle — what happens when a customer applies a code](#request-lifecycle--what-happens-when-a-customer-applies-a-code)
8. [Validation — the 11 rules in plain words](#validation--the-11-rules-in-plain-words)
9. [Atomic redemption — the race-safe path at order time](#atomic-redemption--the-race-safe-path-at-order-time)
10. [Auto-apply codes](#auto-apply-codes)
11. [Platform vs. seller codes](#platform-vs-seller-codes)
12. [Frontend integration](#frontend-integration)
13. [Admin UI tour](#admin-ui-tour)
14. [Bulk minting](#bulk-minting)
15. [Abuse protection + rate limits](#abuse-protection--rate-limits)
16. [Referral codes](#referral-codes)
17. [API reference](#api-reference)
18. [Operations](#operations)
19. [Troubleshooting](#troubleshooting)
20. [Where the code lives](#where-the-code-lives)

---

## Mental model in 60 seconds

The system has **four nouns**:

```
PromoCode        the rule + the human-readable code (SUMMER20, FREESHIP, ...)
PromoRedemption  one row per successful use on a confirmed order
PromoAttempt     one row per validation attempt — abuse log
ReferralCode     per-user referral codes that trigger a PromoCode for the new user
```

**A PromoCode** carries everything needed to validate + calculate a discount:
the type (percentage, fixed, free shipping…), eligibility constraints (min
order value, user segment, target products), schedule, usage limits, and an
optional **seller** FK.

**A PromoRedemption** is created atomically with the order at checkout — never
speculatively. The row snapshots the discount value at the moment of redemption
so future audits aren't affected by edits to the code.

That's the whole system in one paragraph.

---

## Glossary

| Term | Meaning |
|---|---|
| **PromoCode** | The rule. Has a unique `code`, a discount type + value, eligibility rules, limits, schedule, and optional seller. |
| **Code** | The string the customer types (`SUMMER20`). Unique, case-insensitive, auto-uppercased. |
| **Scope** | Either **platform-wide** (`seller` is null) — applies across the store — or **seller-scoped** — applies only when items from that seller are in the cart. |
| **Discount type** | `percentage`, `fixed_amount`, `free_shipping`, `buy_x_get_y`, `fixed_price`. |
| **Target type** | `entire_order`, `products`, `categories`, `seller_products`. Restricts which line items the discount applies to. |
| **User segment** | `all`, `new` (first order), `returning`, `logged_in`, `specific`. Restricts who can use the code. |
| **Stackable** | Whether the code can combine with other promos on the same order. Default: false. |
| **Auto-apply** | Code applies automatically when the cart matches its rules — no manual entry. Highest `auto_apply_priority` wins. |
| **Per-user limit** | How many times one user can redeem this code. Default: 1. |
| **Global limit** | Total redemptions across all users. `null` = unlimited. |
| **Redemption** | One successful use on a confirmed order. Created atomically inside the order transaction. |
| **Attempt** | Every validation request — success or failure. Used for abuse detection. |

---

## TL;DR — install and seed

```bash
cd Stores-BE
venv/Scripts/python.exe manage.py migrate promotions
venv/Scripts/python.exe manage.py seed_promos
```

You'll get six demo codes:

| Code | What it does |
|---|---|
| `WELCOME10` | 10% off, first-order-only, capped at GHS 100 |
| `SAVE50` | GHS 50 off orders ≥ GHS 500 |
| `FREESHIP` | Free shipping on orders ≥ GHS 100 |
| `FLASH20` | 20% off (capped at GHS 200) — limited to 100 uses, expires in 7 days |
| `AUTOSHIP` | Auto-applied free shipping when cart > GHS 1000 |
| `BUNDLE3` | Buy 2 get 1 free — needs 3+ items |

Now run both servers:

```bash
cd Stores-BE && venv/Scripts/python.exe manage.py runserver
cd Stores-FE && npm run dev
```

Open http://localhost:3000/cart, type `SAVE50`, click **Apply** — you'll see
the discount applied to the order summary live.

Manage codes in **Stores-Admin → Products → Promo Codes** (`/admin/promos`).

---

## Tutorial — your first code in 3 minutes

**Goal:** ship a "20% off seller XYZ's products this weekend" promo.

### 1. Find the seller's UUID

In **Admin → Sellers**, click the seller — their `id` is in the URL. Copy it.

### 2. Create the code

> **Admin → Promo Codes → New code**
>
> - Code: `XYZ20`
> - Internal name: `XYZ Weekend 20% off`
> - Description: `20% off all XYZ products this weekend`
> - **Scope:** click the right box and paste the seller UUID.
> - Discount → Type: **Percentage off** · Value: **20** · Max GHS: **100**
> - Eligibility → Target: **All of seller's products**
> - Limits → Max per user: **1** · Ends at: pick Sunday midnight
> - Save

### 3. Test it

Open `/cart`, add an item from that seller, type `XYZ20`, click Apply.
The discount appears. If you remove the item, the code rejects with
"This code only applies to specific seller's products — none are in your cart."

### 4. Watch performance

Back in Admin → Promo Codes, the row's **Usage** bar fills as customers
redeem. Switch to the **Redemptions** tab to see every order it was used on,
with discount amount + customer.

That's it.

---

## The data model

```
PromoCode (the rule)
    │   code · name · description · is_active
    │   seller (optional) ──► SellerProfile  (null = platform-wide)
    │
    │   discount_type · discount_value · max_discount_amount
    │   buy_quantity · get_quantity · fixed_price · include_free_shipping
    │
    │   target_type · products M2M · categories M2M
    │
    │   min_order_value · min_items_count
    │   user_segment · specific_users M2M
    │   stackable · first_order_only
    │
    │   max_redemptions · max_redemptions_per_user · current_redemptions
    │   starts_at · ends_at
    │   auto_apply · auto_apply_priority
    │
    ├──► PromoRedemption (one per successful order)
    │      promo · user (or session_key for guest)
    │      order_id
    │      discount_amount · order_subtotal      (snapshot)
    │      discount_type_snap · discount_value_snap (snapshot)
    │
    └──► PromoAttempt (every validation attempt)
           code · user_id · ip_address · session_key
           success · error_code · attempted_at

ReferralCode  (per-user; uses a PromoCode as its "first-order discount" for the referee)
    user · code · referral_promo (FK to PromoCode)
    reward_type · reward_value · total_referrals
```

All defined in [models.py](models.py).

---

## Discount types

| Type | What `discount_value` means | Example |
|---|---|---|
| `percentage` | 1–100 (%) | 20% off (cap with `max_discount_amount`) |
| `fixed_amount` | GHS amount | GHS 10 off |
| `free_shipping` | ignored | Shipping zeroed; subtotal unchanged |
| `buy_x_get_y` | ignored — uses `buy_quantity` and `get_quantity` | Buy 2 get 1 free |
| `fixed_price` | ignored — uses `fixed_price` | Pay GHS 499 total regardless of subtotal |

**`include_free_shipping`** is an orthogonal toggle — turn it on to grant free
shipping in addition to the main discount type. (Useful for "20% off + free
shipping" combos.)

---

## Request lifecycle — what happens when a customer applies a code

```
Browser                         Stores-FE                       BE / DB
───────                         ─────────                       ───────
type "SAVE50" in cart input
click Apply
  │
  │ usePromo.apply("SAVE50", cart)
  │
  ▼
PromoCodeInput component
  │
  │ POST /tradehut/api/v1/promos/validate/
  │ { code, subtotal, item_count, item_ids,
  │   category_ids, seller_ids, seller_subtotals }
  ├──────────────────────────►
  │
  │                            validate_promo_view
  │                            check IP isn't suspicious
  │                            build CartContext from request
  │                            services.validate_promo(code, cart, user)
  │                                ─►  11 rule checks (see below)
  │                                ─►  _calculate_discount(...)
  │                                ─►  log PromoAttempt
  │                            returns ValidationResult
  │
  │ ◄──────────────────────────  { valid, discount_amount, free_shipping,
  │                                description, error_code, error_message }
  │
  │ setResult(data)
  │ onChange(data) → cart updates totals (subtotal − discount)
  │
  ▼
applied state shown
"SAVE50 — GHS 50.00 off"
```

Then at order placement:

```
checkout submit
  │
  │ POST /api/orders/  (your order endpoint)
  │ body includes appliedPromo.code
  │
  ▼
inside order transaction (atomic):
  result = validate_promo(code, cart, user)   # re-validate server-side
  if result.valid:
      order = build_order_at_discounted_total(...)
      redeem_promo(promo, order, user, result.discount_amount)
      → atomic F() update on current_redemptions
      → create PromoRedemption row (snapshot)
```

The cart-side validation is purely informational — **the BE re-validates at
order time, inside a database transaction.** Race-safe, never trusts the FE.

---

## Validation — the 11 rules in plain words

`services.validate_promo` runs these in order. Cheap → expensive. First failure
returns the error to the user.

1. **Code exists.** Strip + uppercase, look up. Not found → "doesn't exist."
2. **Active flag.** `is_active=False` → "no longer active."
3. **Date range.** Now must be ≥ `starts_at` (if set) and ≤ `ends_at` (if set).
4. **Global redemption limit.** Re-fetched from DB (not cached) so concurrent races are safe.
5. **Min order value.** Subtotal must reach the floor.
6. **Min items count.** Cart must have at least N items.
7. **User segment.** `new` requires no completed orders; `returning` requires at least one; `logged_in` requires auth; `specific` requires the user be in `specific_users`.
8. **Per-user redemption limit.** Counts existing PromoRedemption rows for this user against this promo.
9. **Seller scoping.** If the code is seller-scoped, **at least one item in the cart must belong to that seller** (the FE passes `seller_ids` on the cart).
10. **Product / category eligibility.** If `target_type` restricts to products or categories, the cart must contain matching items.
11. **Calculate the discount** and return.

Each step that fails also logs a `PromoAttempt` with `success=false` and the
machine-readable `error_code`.

| Error code | Meaning |
|---|---|
| `not_found` | Code doesn't exist |
| `inactive` | Toggled off |
| `expired` | Past end date |
| `not_started` | Before start date |
| `exhausted` | Hit the global cap |
| `min_order` | Subtotal too low |
| `min_items` | Not enough items |
| `user_segment` | Wrong audience |
| `per_user_limit` | This user already used it |
| `seller_mismatch` | Seller-scoped code, no matching items in cart |
| `no_eligible_items` | Product/category-targeted, no matches |
| `rate_limited` | Too many failed attempts from this IP |

---

## Atomic redemption — the race-safe path at order time

```python
from apps.promotions.services import validate_promo, redeem_promo, CartContext

with transaction.atomic():
    cart = CartContext(subtotal=cart_total, item_count=qty, ...)
    result = validate_promo(code, cart, user)
    if not result.valid:
        raise PromoInvalid(result.error_message)

    order = create_order_at_discounted_total(...)

    # Atomic increment + immutable redemption snapshot
    redeem_promo(
        promo=result.promo,
        order=order,
        user=user,
        discount_amount=result.discount_amount,
    )
```

`redeem_promo` uses an `F()` conditional update:

```python
PromoCode.objects.filter(
    pk=promo.pk,
    current_redemptions__lt=F("max_redemptions"),
).update(current_redemptions=F("current_redemptions") + 1)
```

If two requests race for the last slot, only one wins — the other gets
`PromoExhaustedException` and rolls back. No double-spend, no oversold
discounts.

The redemption row **snapshots** `discount_type` and `discount_value` so
analytics never lie even if you later edit the live promo.

---

## Auto-apply codes

Set `auto_apply=True` on a code and it will surface automatically on every
cart update — no manual entry needed.

```
GET /tradehut/api/v1/promos/auto/?subtotal=1200&item_count=2

→ { "promo": { "code": "AUTOSHIP", "discount_amount": "0", "free_shipping": true, ... } }
```

If multiple auto-apply codes match, the highest `auto_apply_priority` wins.

The FE hook `useAd` is **not** the same as `usePromo`; auto-apply is exposed
via:

```ts
const { autoApply } = usePromo()
useEffect(() => { autoApply({ subtotal, item_count }) }, [subtotal])
```

It's safe to call on every cart change — `usePromo` skips the call if the user
has already manually applied a code.

---

## Platform vs. seller codes

Every PromoCode has a nullable `seller` foreign key:

| `seller` | Behaviour |
|---|---|
| `NULL` | **Platform-wide.** Managed by ops/marketing in `/admin/promos`. Validates against the entire cart. |
| `SellerProfile` FK | **Seller-scoped.** Created/managed by that seller's account via the `/promos/seller/codes/` API. Validates only when the cart contains items from that seller (via `seller_ids` in the request). |

The validation step *Seller scoping* (#9 above) enforces this. You can also
combine it with `target_type=seller_products` so the discount calculation only
applies to that seller's portion of the cart subtotal (the FE passes
`seller_subtotals: { "<seller_uuid>": "300.00" }`).

### Permission gates

- `PromosAdminPermission` (in `permissions.py`): `is_staff` or `is_superuser`.
  Used by `/promos/admin/codes/` — full CRUD over every code.
- `SellerPromoPermission`: requires `request.user.seller_profile` to exist.
  Used by `/promos/seller/codes/` — sellers can only see/edit codes
  with `seller_id == self.seller_profile.id`.

The seller viewset *automatically* sets `seller=request.user.seller_profile`
on create — sellers cannot spoof the seller field.

---

## Frontend integration

### Drop-in cart input

```tsx
import { PromoCodeInput } from '@/components/Promo'
import type { PromoResult } from '@/hooks/usePromo'

const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null)

<PromoCodeInput
    cart={{
        subtotal,
        item_count: lines.length,
        item_ids: lines.map(l => String(l.id)),
        // optional: seller_ids and seller_subtotals for seller-scoped promos
    }}
    initial={appliedPromo}
    onChange={setAppliedPromo}
    collapsible   // collapses to "Have a promo code?" link until clicked
/>

const discount = appliedPromo?.valid
    ? parseFloat(appliedPromo.discount_amount)
    : 0
const freeShipping = !!appliedPromo?.free_shipping
const total = Math.max(0, subtotal - discount) + (freeShipping ? 0 : shipping) + tax
```

Already wired into both [Stores-FE/app/cart/page.tsx](../../../Stores-FE/app/cart/page.tsx)
and [Stores-FE/app/checkout/page.tsx](../../../Stores-FE/app/checkout/page.tsx).

### Headless hook

```tsx
const { result, loading, apply, remove, autoApply } = usePromo()
const ok = await apply('SAVE50', { subtotal: 600, item_count: 3 })
```

### Direct client (no React)

```ts
import { validatePromo, autoApplyPromo, listApplicablePromos } from '@/lib/promos'

const r = await validatePromo('SAVE50', { subtotal: 600, item_count: 3 })
```

---

## Admin UI tour

`/admin/promos` is built around two tabs (`PromosManagement/index.tsx`):

### Dashboard hero

The header shows live system health:
- **Total codes / Active codes** breakdown
- **Platform vs. seller codes** counts
- **Discount given · 30d** total + redemption count

### Codes tab

A filterable table:
- Status segmented filter (All / Platform / Active / Paused)
- Search by code or name
- Each row shows: scope badge (platform / seller), discount badge (color-coded
  by type), live status pill, schedule, **usage progress bar** (red → amber →
  green based on % consumed)
- Inline actions: pause/resume, **bulk-generate from this template**, edit, delete
- Editor modal: full CRUD with a discount-type picker grid, segment buttons,
  schedule pickers, and an auto-apply toggle

### Bulk-generate modal

From any existing code, click the wand icon → mint N unique codes (up to 500)
that copy the template's rules. Each minted code defaults to **inactive** so
you can review before enabling.

### Redemptions tab

Read-only log of every successful redemption — when, code, customer, order id,
subtotal, discount amount. Searchable by code/email/order id.

---

## Bulk minting

Three options, depending on volume:

### From the admin UI (fastest, ≤ 500)

Click the wand icon on any code → set count + prefix → mint.

### Management command (any volume + CSV export)

```bash
venv/Scripts/python.exe manage.py generate_promo_codes \
  --prefix SUMMER --count 100 \
  --discount-type percentage --discount-value 15 \
  --max-redemptions 1 --expires 2026-09-01 \
  --output summer_codes.csv --activate

# Seller-scoped batch (paste a SellerProfile UUID)
venv/Scripts/python.exe manage.py generate_promo_codes \
  --prefix VENDOR1 --count 25 \
  --discount-type fixed_amount --discount-value 10 \
  --seller-id <SellerProfile UUID>
```

### Programmatically

```python
from apps.promotions.models import PromoCode

codes = PromoCode.generate_bulk(count=100, prefix="INFLUENCER")
for code in codes:
    PromoCode.objects.create(
        code=code, name="Influencer batch",
        discount_type=PromoCode.DiscountType.PERCENTAGE,
        discount_value=15, max_redemptions=1,
        max_redemptions_per_user=1,
        is_active=False,
    )
```

---

## Abuse protection + rate limits

### Rate limits

`/promos/validate/` is throttled per DRF:
- Anonymous: **20/min** per IP
- Authenticated: **60/min** per user

Returns `429 Too Many Requests` if exceeded.

### Suspicious-IP gate

Before validating, the view checks `services.is_suspicious(ip)` — if this IP
has **≥ 10 failed attempts in the last hour**, the request is rejected with
429. This kills brute-force code-guessing attacks.

### Attempt log

Every validation attempt — success or failure — writes one row to
`PromoAttempt`. Indexed on `(ip_address, attempted_at)` and
`(code, attempted_at)`. Useful for forensics and for cleaning up
stuffed/leaked codes.

### Recommended periodic prune

`PromoAttempt` grows fast. A nightly job:

```python
from datetime import timedelta
from django.utils import timezone
from apps.promotions.models import PromoAttempt

PromoAttempt.objects.filter(
    attempted_at__lt=timezone.now() - timedelta(days=30)
).delete()
```

---

## Referral codes

`ReferralCode` extends the promo system per-user:

```python
from apps.promotions.models import ReferralCode

ref = ReferralCode.get_or_create_for_user(request.user)
# ref.code  →  e.g. "REF-ELLIS-X7K2"
# ref.referral_promo  →  the PromoCode applied when a NEW user uses this code
# ref.total_referrals → bumped automatically on every redemption (via signal)
```

Workflow:

1. Each user gets a unique referral code on signup (or first invocation of `get_or_create_for_user`).
2. The `referral_promo` FK points to a normal PromoCode (typically a first-order discount).
3. When a new user redeems that PromoCode at checkout, the
   `bump_referral_counter` signal increments the referrer's `total_referrals`.
4. You can read `ReferralCode.objects.values('user_id').annotate(...)` to
   hand out reciprocal rewards (store credit, points, discount on next order).

---

## API reference

### Public — anonymous, called from the storefront

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/tradehut/api/v1/promos/validate/` | Validate a code against a cart |
| `GET` | `/tradehut/api/v1/promos/auto/?subtotal=&item_count=` | Auto-apply check on cart update |
| `GET` | `/tradehut/api/v1/promos/applicable/?subtotal=&item_count=` | List visible promos for a "have a code?" hint |

### Admin — `is_staff` required

| Method | Path | Purpose |
|---|---|---|
| `GET / POST / PATCH / DELETE` | `/tradehut/api/v1/promos/admin/codes/` | Full CRUD across the platform |
| `POST` | `/tradehut/api/v1/promos/admin/codes/<pk>/toggle/` | Pause / resume |
| `POST` | `/tradehut/api/v1/promos/admin/codes/bulk-generate/` | Mint N codes from a template |
| `GET` | `/tradehut/api/v1/promos/admin/codes/stats/` | Dashboard counts |
| `GET` | `/tradehut/api/v1/promos/admin/redemptions/` | Read-only redemption log |
| `CRUD` | `/tradehut/api/v1/promos/admin/referrals/` | Manage referral codes |

Filter the admin list with: `?seller=<uuid>`, `?platform_only=1`,
`?is_active=1`, `?q=summer`.

### Seller — requires `request.user.seller_profile`

| Method | Path | Purpose |
|---|---|---|
| `GET / POST / PATCH / DELETE` | `/tradehut/api/v1/promos/seller/codes/` | CRUD over THIS seller's promos only |
| `POST` | `/tradehut/api/v1/promos/seller/codes/<pk>/toggle/` | Pause / resume |
| `GET` | `/tradehut/api/v1/promos/seller/codes/stats/` | Seller's own dashboard counts |

The seller viewset auto-fills `seller=request.user.seller_profile.pk` on
create. Sellers cannot list/read/edit other sellers' codes — every endpoint
filters by ownership.

---

## Operations

### Seed demo data

```bash
venv/Scripts/python.exe manage.py seed_promos
venv/Scripts/python.exe manage.py seed_promos --reset
```

Source: [management/commands/seed_promos.py](management/commands/seed_promos.py).

### SQL for dashboards

```sql
-- Top 10 codes by revenue influenced (last 30 days)
SELECT
  c.code,
  COUNT(r.id)              AS redemptions,
  SUM(r.discount_amount)   AS discount_given,
  SUM(r.order_subtotal)    AS revenue_influenced,
  ROUND(100.0 * SUM(r.discount_amount) / NULLIF(SUM(r.order_subtotal), 0), 2) AS effective_discount_pct
FROM promotions_promocode c
JOIN promotions_promoredemption r ON r.promo_id = c.id
WHERE r.created_at > NOW() - INTERVAL '30 days'
GROUP BY c.code
ORDER BY revenue_influenced DESC
LIMIT 10;

-- Failure breakdown by error_code (last 24h) — useful for spotting issues
SELECT error_code, COUNT(*) AS attempts
FROM promotions_promoattempt
WHERE success = FALSE AND attempted_at > NOW() - INTERVAL '1 day'
GROUP BY error_code
ORDER BY attempts DESC;
```

### Tables that grow fast

`promotions_promoattempt` writes one row per validation request. Add a
nightly prune (see [Abuse protection](#abuse-protection--rate-limits)).

`promotions_promoredemption` grows with order volume — keep it forever. It's
the audit trail.

### Adding the validation step to your order endpoint

```python
# in your order create view, inside transaction.atomic():
from apps.promotions.services import validate_promo, redeem_promo, CartContext

cart_ctx = CartContext(
    subtotal=order.subtotal,
    item_count=order.line_items.count(),
    item_ids=[str(li.product_id) for li in order.line_items.all()],
    seller_ids=[str(li.product.seller_id) for li in order.line_items.all()],
    user_id=str(request.user.pk),
    session_key=request.session.session_key or "",
    ip_address=get_ip(request),
)

if promo_code:
    result = validate_promo(promo_code, cart_ctx, user=request.user)
    if not result.valid:
        raise ValidationError({"promo_code": result.error_message})
    order.discount_amount = result.discount_amount
    order.save()
    redeem_promo(
        promo=result.promo,
        order=order,
        user=request.user,
        discount_amount=result.discount_amount,
    )
```

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `value too long for type character varying(20)` | Migration `0003` not applied. `python manage.py migrate promotions`. |
| `not_found` returned for a code that exists | Check casing — codes are uppercased. Check `is_active` and the date range. |
| `seller_mismatch` for a seller code | The cart's `seller_ids` array doesn't include this seller. Make sure the FE passes `seller_ids: [...]` in the cart payload. |
| Code applies in cart but disappears at checkout | The cart and checkout pages are fetching different cart shapes. Pass the same `cart` snapshot to both `<PromoCodeInput>` instances. |
| 429 from `/promos/validate/` | Either rate-limit hit (>20/min anon) or this IP has 10+ recent failures. Check `PromoAttempt` for the IP. |
| New code not visible in seller dashboard | Sellers only see codes where `seller_id == self.seller_profile.id`. Confirm the `seller` field on the code matches. |
| `current_redemptions` not incrementing | You called `validate_promo` but never `redeem_promo`. Validation is read-only; redemption must run inside the order transaction. |
| Per-user-limit always says "already used" | A previous failed test order created a redemption row. Delete the row, or reset the seed: `manage.py seed_promos --reset`. |
| `PromoExhaustedException` raised | Two requests raced for the last slot of a `max_redemptions` code — only one wins. Surface a friendly error to the loser and offer them another code. |

---

## Where the code lives

| Concern | File |
|---|---|
| Models (PromoCode, PromoRedemption, PromoAttempt, ReferralCode) | [models.py](models.py) |
| Validation + discount math + atomic redemption + auto-apply | [services.py](services.py) |
| Public + admin + seller serializers | [serializers.py](serializers.py) |
| Public endpoints (validate / auto / applicable) | [views.py](views.py) |
| Admin + seller CRUD viewsets | [admin_views.py](admin_views.py) |
| URL conf | [urls.py](urls.py) |
| Permission gates (`is_staff` / seller_profile) | [permissions.py](permissions.py) |
| Signal: bump referral counter on redemption | [signals.py](signals.py) |
| Django admin (backup CRUD UI) | [admin.py](admin.py) |
| Bulk-mint command | [management/commands/generate_promo_codes.py](management/commands/generate_promo_codes.py) |
| Demo seeder | [management/commands/seed_promos.py](management/commands/seed_promos.py) |
| **Storefront client** (validate / auto-apply / dismiss memory) | [Stores-FE/lib/promos.ts](../../../Stores-FE/lib/promos.ts) |
| **Storefront hook** | [Stores-FE/hooks/usePromo.ts](../../../Stores-FE/hooks/usePromo.ts) |
| **Storefront component** (`<PromoCodeInput>`) | [Stores-FE/components/Promo/](../../../Stores-FE/components/Promo/) |
| **Admin client** (typed CRUD wrapper) | [Stores-Admin/src/services/promosAdminService.ts](../../../Stores-Admin/src/services/promosAdminService.ts) |
| **Admin UI** (dashboard + Codes tab + Redemptions tab) | [Stores-Admin/src/pages/admin/PromosManagement/](../../../Stores-Admin/src/pages/admin/PromosManagement/) |
