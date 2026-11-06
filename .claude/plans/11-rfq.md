# 11 — RFQ (Request for Quotation) — FROZEN CONTRACT

Shared conventions (errors, money, idempotency, pagination, `IsSeller`/`IsVerifiedSeller`, `notify()`, `orders.services`) are in `20-seller-and-checkout-gaps.md` §0–§2.

## 1. Goal / non-goals

**Goal.** A buyer posts a request. Matching suppliers (sellers) submit one private quote each. The buyer awards one quote, which creates a pending order for the buyer to pay. All quoters are notified.

**Non-goals (v1).** Public RFQ marketplace browsing. Buyer↔supplier messaging (P1). Quote attachments. Shortlisting. Negotiation rounds / counter-offers. Partial awards / multi-supplier splits. Buyer tiers, sustainability badges, view counts.

## 2. Spec validation

| Spec item | Verdict | Frozen decision |
| --- | --- | --- |
| App `apps/rfqs/` | AGENTS §7 | `apps/rfq/` |
| States `draft, open, reviewing, awarded, closed, cancelled` | AGENTS §4: `draft → open → quoting → awarded → closed\|cancelled\|expired` | AGENTS states; `reviewing` dropped |
| `category` FK nullable | Matching needs a category | **Required** FK `catalog.Category` (`apps/catalog/models.py:14`) |
| `RFQSpec` table | Overkill | `specs` JSONField `[{label,value}]` ≤ 20 |
| `QuoteAttachment`, `shortlisted` | Not P0 | Dropped |
| `buyer_tier`, `is_sustainable`, `requires_verification`, `view_count` | Cosmetic | Dropped |
| `Quote.total_price` client-supplied | Money must be server-computed | `total_price = unit_price × quantity` server-side; add `shipping_cost` |
| `Quote.status` set | | `submitted, withdrawn, accepted, not_selected` |
| `rfq.awarded` signal → order | Signals hide control flow | Direct call to `orders.services.create_order_for_rfq` in the award transaction |
| Supplier visibility | Spec lists public RFQs; AGENTS says suppliers see only category matches | No public list. Matching = categories of the seller's own products (README D8) |

## 3. Models (`apps/rfq/models.py`)

### RFQ (`db_table="rfqs"`)

| Field | Type | Notes |
| --- | --- | --- |
| reference | Char(16) unique | `"RFQ-" + 8 random base32 chars`, retry ×3 on IntegrityError |
| buyer | FK User PROTECT `related_name="rfqs"` | |
| title | Char(200) | |
| description | Text | ≤ 5000 |
| category | FK `catalog.Category` PROTECT | |
| sub_category | FK `catalog.SubCategory` null SET_NULL | |
| quantity | PositiveInteger | ≥ 1 |
| unit | Char(32) default "units" | |
| budget_min, budget_max | Decimal(14,2) null | |
| currency | Char(3) | store base currency |
| delivery_country | Char(2) | ISO |
| delivery_city | Char(120) blank | |
| needed_by | Date null | |
| closes_at | DateTime | quote deadline |
| specs | JSON default list | |
| status | Char(12) choices, default `draft`, db_index | |
| quote_count | PositiveInteger default 0 | count of `submitted` quotes |
| awarded_quote | FK `Quote` null SET_NULL `related_name="+"` | |
| order | FK `orders.Order` null SET_NULL `related_name="+"` | |
| published_at, awarded_at, closed_at, cancelled_at | DateTime null | |
| create_idempotency_key | Char(64) | |
| award_idempotency_key | Char(64) null | |
| created_on | DateTime default now, db_index | |

Constraints: `UniqueConstraint(buyer, create_idempotency_key)`; `Check(budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)`; `Check(quantity >= 1)`. Indexes: `(status, closes_at)`, `(category, status)`, `(buyer, status)`.

### RFQAttachment (`db_table="rfq_attachments"`)
`rfq` FK CASCADE `related_name="attachments"`, `file` FileField(`upload_to="rfq_attachments/%Y/%m/"`), `filename` Char(255), `content_type` Char(100), `size` PositiveInteger, `created_on`. Limits: ≤ 5 per RFQ, ≤ 10 MB, types pdf/png/jpeg/webp. Validate by content type **and** extension.

### Quote (`db_table="rfq_quotes"`)

| Field | Type | Notes |
| --- | --- | --- |
| rfq | FK RFQ PROTECT `related_name="quotes"` | |
| supplier | FK `sellers.SellerProfile` PROTECT `related_name="rfq_quotes"` | |
| product | FK `products.Product` null SET_NULL | must be supplier's own |
| unit_price | Decimal(12,2) | > 0 |
| quantity | PositiveInteger | copied from rfq |
| total_price | Decimal(14,2) | server: `unit_price × quantity` |
| shipping_cost | Decimal(12,2) default 0 | ≥ 0 |
| currency | Char(3) | = rfq.currency |
| lead_time_days | PositiveSmallInteger | 1..365 |
| valid_until | DateTime null | |
| notes | Text blank | ≤ 2000 |
| status | Char(14) choices, db_index | |
| submitted_at, withdrawn_at | DateTime null | |
| idempotency_key | Char(64) null | |
| created_on | DateTime default now | |

Constraints: `UniqueConstraint(rfq, supplier)` (one quote per supplier per RFQ); `Check(unit_price > 0)`; `Check(shipping_cost >= 0)`. Indexes: `(rfq, status)`, `(supplier, status)`.

Constants (`apps/rfq/constants.py`): `MIN_OPEN = 24h`, `MAX_OPEN = 60d`, `AWARD_GRACE = 7d`, `PAYMENT_WINDOW = 72h`, `MAX_SPECS = 20`, `MAX_ATTACHMENTS = 5`.

## 4. State machines

RFQ:

| From | Event | Actor | Guard | To | Side effects |
| --- | --- | --- | --- | --- | --- |
| — | create (`publish=false`) | buyer | | draft | |
| — / draft | create(`publish=true`) / publish | buyer | `closes_at ∈ [now+24h, now+60d]` | open | `published_at` |
| draft | cancel | buyer | | cancelled | |
| open | first quote submitted | system | | quoting | notify buyer |
| quoting | last active quote withdrawn | system | `quote_count == 0` | open | |
| open / quoting | cancel | buyer | | cancelled | quotes → not_selected; notify quoters |
| open | sweeper | system | `closes_at ≤ now` | expired | notify buyer |
| quoting | award(quote) | buyer | `now ≤ closes_at + AWARD_GRACE` | awarded | order created; quote accepted; others not_selected; notify all |
| quoting | sweeper | system | `closes_at + AWARD_GRACE ≤ now` | expired | quotes → not_selected; notify buyer + quoters |
| awarded | sweeper | system | `order.payment_status == "paid"` | closed | `closed_at` |
| awarded | sweeper | system | `order.order_status == "Cancelled"` (payment lapsed) | expired | notify supplier |
| closed / cancelled / expired | anything | | | (no-op) | idempotent |

Quote:

| From | Event | Guard | To |
| --- | --- | --- | --- |
| — | submit | rfq open/quoting, `now < closes_at` | submitted |
| submitted | edit | same guard | submitted |
| submitted | withdraw | rfq open/quoting | withdrawn |
| withdrawn | resubmit (POST again) | same as submit | submitted |
| submitted | award this | | accepted |
| submitted | award other / rfq cancelled / rfq expired | | not_selected |

## 5. Correctness-critical services (`apps/rfq/services.py`)

**Lock order**: RFQ → Quote → Order. Every write path below locks the RFQ row first, which serializes submit/withdraw/award/cancel per RFQ and avoids deadlocks.

```python
def submit_quote(*, rfq_id, seller, data, idempotency_key) -> tuple[Quote, bool]:
    with transaction.atomic():
        rfq = RFQ.objects.select_for_update(of=("self",)).get(pk=rfq_id)
        assert_matches(rfq, seller)                       # 404 if category not in seller categories, or rfq.buyer == seller.user
        if rfq.status not in ("open", "quoting") or timezone.now() >= rfq.closes_at:
            raise ApiError(409, "rfq_not_accepting_quotes")
        q = Quote.objects.select_for_update().filter(rfq=rfq, supplier=seller).first()
        if q and q.status == "submitted":
            if q.idempotency_key == idempotency_key: return q, False     # replay
            raise ApiError(409, "quote_exists", quote_id=str(q.id))
        if q and q.status in ("accepted", "not_selected"): raise ApiError(409, "rfq_not_accepting_quotes")
        q = upsert(q, rfq, seller, data, idempotency_key)   # total = unit_price * rfq.quantity; status submitted
        rfq.quote_count = rfq.quotes.filter(status="submitted").count()
        if rfq.status == "open": rfq.status = "quoting"
        rfq.save(update_fields=["quote_count", "status", "updated_at"])
        transaction.on_commit(lambda: notify(rfq.buyer_id, "rfq.quote_received", ...))
    return q, True

def award(*, rfq_id, buyer, quote_id, idempotency_key) -> RFQ:
    with transaction.atomic():
        rfq = RFQ.objects.select_for_update(of=("self",)).get(pk=rfq_id, buyer=buyer)   # else 404
        if rfq.status == "awarded":
            if rfq.awarded_quote_id == quote_id: return rfq                         # replay → 200
            raise ApiError(409, "already_awarded")
        if rfq.status != "quoting":                         raise ApiError(409, "rfq_not_awardable")
        now = timezone.now()
        if now > rfq.closes_at + AWARD_GRACE:                raise ApiError(409, "award_window_closed")
        quote = Quote.objects.select_for_update().get(pk=quote_id, rfq=rfq)          # else 404
        if quote.status != "submitted":                     raise ApiError(409, "quote_not_available")
        if quote.valid_until and quote.valid_until < now:   raise ApiError(409, "quote_expired")
        order = orders_services.create_order_for_rfq(rfq, quote)   # UniqueConstraint(source, source_id)
        quote.status = "accepted"; quote.save(update_fields=["status", "updated_at"])
        others = list(rfq.quotes.filter(status="submitted").exclude(pk=quote.pk).values_list("supplier__user_id", flat=True))
        rfq.quotes.filter(status="submitted").exclude(pk=quote.pk).update(status="not_selected")
        rfq.status, rfq.awarded_quote, rfq.order, rfq.awarded_at = "awarded", quote, order, now
        rfq.award_idempotency_key = idempotency_key
        rfq.save()
        transaction.on_commit(lambda: _notify_award(rfq.id, quote.supplier.user_id, others))
    return rfq
```

`withdraw_quote`, `cancel_rfq` and `edit_quote` follow the same lock-RFQ-first pattern and recompute `quote_count` under the lock.

Order on award (`orders.services.create_order_for_rfq(rfq, quote) -> Order`, 20 §2): `Order(source="rfq", source_id=rfq.id, user=buyer, seller=quote.supplier, currency, subtotal=quote.total_price, shipping_cost=quote.shipping_cost, total_amount=subtotal+shipping, order_status="Pending", payment_status="unpaid", payment_due_at=now+72h, delivery_method="quote", pay_mode="Online")` plus `OrderItem(title=rfq.title, product=quote.product, variant=None, quantity, unit_price, total_price)`. There are no stock operations. Tax is applied at pay time by `price_order_for_payment`.

Matching (`selectors.seller_categories(seller)`): `Category.objects.filter(product__seller_profile=seller, product__status__in=["Active","Published"]).distinct()`. A match also requires `rfq.buyer_id != seller.user_id`. Suppliers additionally always see RFQs they have quoted on, regardless of state.

Sweeper `apps/rfq/tasks.py::sweep_rfqs` (beat every 300s). Each transition below runs per row, under `select_for_update` and the state guard, in its own transaction: open→expired, quoting→expired (+not_selected), awarded→closed / expired by order state.

## 6. Endpoints (prefix `/tradehut/api/v1/rfq/`, `<uuid:pk>`)

### Buyer — `IsAuthenticated`; querysets `filter(buyer=request.user)` (others → 404)

| # | Method & path | Request | Response | Errors | Idempotency |
| --- | --- | --- | --- | --- | --- |
| R1 | `GET /rfq/requests/` | `?status=`, `page` | page of RFQRow `{id, reference, title, category{id,name}, quantity, unit, status, quote_count, closes_at, awarded_quote_id, order_id, created_on}` | — | safe |
| R2 | `POST /rfq/requests/` | header `Idempotency-Key`; `{title, description, category_id, sub_category_id?, quantity, unit?, budget_min?, budget_max?, delivery_country, delivery_city?, needed_by?, closes_at, specs?[], publish: bool}` | 201 RFQDetail (200 replay) | 400 field rules; 404 `category_not_found` | `(buyer, key)` |
| R3 | `GET /rfq/requests/<id>/` | — | RFQDetail = R1 fields + `description, budget_min, budget_max, currency, delivery_*, needed_by, specs, attachments[{id,filename,url,size}], quotes[BuyerQuote]` (quotes only once status ≠ draft; sorted by `total_price+shipping_cost` asc) | 404 | safe |
| R4 | `PATCH /rfq/requests/<id>/` | draft: any R2 field. open with 0 quotes: description/specs/closes_at. quoting: `closes_at` (extend only) | 200 RFQDetail | 409 `not_editable`; 400 closes_at bounds | naturally |
| R5 | `POST /rfq/requests/<id>/publish/` | — | 200 RFQDetail | 409 `invalid_state`; already open → 200 | naturally |
| R6 | `POST /rfq/requests/<id>/cancel/` | `{reason?}` | 200 | 409 if awarded/closed/expired; already cancelled → 200 | naturally |
| R7 | `POST /rfq/requests/<id>/attachments/` (multipart `file`) · `DELETE /rfq/requests/<id>/attachments/<att_id>/` | | 201 `{id,filename,url,size}` / 204 | 400 `file_too_large`/`file_type`/`too_many_attachments`; 409 if not draft/open/quoting | — |
| R8 | `POST /rfq/requests/<id>/award/` | header `Idempotency-Key`; `{quote_id}` | 200 `{rfq: RFQDetail, order_id}` | 404; 409 `already_awarded`/`rfq_not_awardable`/`award_window_closed`/`quote_not_available`/`quote_expired` | replay = same quote → 200 |

**BuyerQuote**: `id, supplier{id,business_name,store_slug,is_verified,rating}, product{id,name,image}|null, unit_price, quantity, total_price, shipping_cost, grand_total, currency, lead_time_days, valid_until, notes, status, submitted_at`.

### Supplier — `IsSeller` to read, `IsVerifiedSeller` to write

| # | Method & path | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| Q1 | `GET /rfq/seller/matches/` | `?category=`, `q=`, `page` | page of MatchRow `{id, reference, title, category, quantity, unit, budget_min, budget_max, currency, delivery_country, delivery_city, closes_at, quote_count, status, my_quote_status|null}`. Only open/quoting with `closes_at > now` | — |
| Q2 | `GET /rfq/seller/matches/<id>/` | — | MatchDetail = MatchRow + `description, specs, needed_by, attachments, buyer{display_name (first name + last initial), city, country, member_since}, my_quote|null` | 404 if not matching and not quoted |
| Q3 | `POST /rfq/seller/matches/<id>/quote/` | header `Idempotency-Key`; `{unit_price, shipping_cost=0, lead_time_days, valid_until?, notes?, product_id?}` | 201 SupplierQuote (200 replay / resubmit of withdrawn) | 403 `seller_not_verified`; 404; 409 `quote_exists`/`rfq_not_accepting_quotes`; 400 `product_not_found` (not mine), field rules |
| Q4 | `PATCH /rfq/seller/quotes/<quote_id>/` | Q3 fields | 200 | 409 `not_editable` |
| Q5 | `POST /rfq/seller/quotes/<quote_id>/withdraw/` | — | 200 | 409 if accepted/not_selected; already withdrawn → 200 |
| Q6 | `GET /rfq/seller/quotes/` | `?status=`, `page` | page of SupplierQuote + `rfq{id,reference,title,status,closes_at}`, `order_id` (if accepted) | — |

Quote privacy: suppliers only ever see their own quote. `quote_count` is shown to suppliers. Buyer contact details are never exposed (messaging is P1; after award the order carries the address).

## 7. Tests (`apps/rfq/tests/`)

(1) create draft/publish with `closes_at` and budget validation, and idempotent create; (2) matching: same-category seller sees it, other-category seller doesn't, buyer's own seller profile doesn't; (3) privacy: supplier A can't read B's quote (not in any payload), non-owner buyer 404 on R3–R8; (4) submit: open→quoting, `quote_count`, duplicate 409, replay 200, withdrawn→resubmit 200; (5) submit after `closes_at` / on cancelled → 409, unverified → 403; (6) withdraw last quote → open; (7) award creates the order with correct totals and due date, accepted/not_selected, notifications enqueued; replay 200 with the same order; a different quote → `already_awarded`; (8) **concurrent award of two different quotes** (TransactionTestCase, Postgres, Barrier) → one order, one 409; (9) **concurrent submit vs award** → the quote ends as `not_selected` (if it committed first) or gets 409, never left `submitted` on an awarded RFQ; (10) sweeper transitions (each row in table §4); (11) cancel → quotes not_selected, idempotent; (12) attachment limits and ownership; (13) `assertNumQueries` bound on R1, Q1.

## 8. Tasks

| ID | Owner | Files (exclusive) | Depends | Acceptance |
| --- | --- | --- | --- | --- |
| **BE-RFQ-1** | be-builder | `Stores-BE/apps/rfq/{models.py, constants.py, selectors.py, services.py, serializers.py, views.py, urls.py, admin.py}`, `apps/rfq/migrations/0001_initial.py`, `apps/rfq/tests/{__init__,test_requests,test_quotes,test_permissions}.py` | BE-0 | `check`; one migration; tests 1–6, 11–13 green; R1–R7, Q1–Q6 per contract (curl evidence) |
| **BE-RFQ-2** | be-builder (same as RFQ-1 preferred) | `apps/rfq/tasks.py`, `apps/rfq/tests/{test_award,test_concurrency,test_sweeper}.py`; appends award to `services.py`/`views.py`/`urls.py` (sequential after RFQ-1) | BE-RFQ-1, BE-ORD-1, BE-NTF-1 | tests 7–10 green; golden path: buyer posts, 2 sellers quote, buyer awards, order appears in `GET /orders/` as Pending/unpaid with due date |
| **FE-RFQ-1** | fe-builder | `Stores-FE/lib/rfqApi.ts`, `Stores-FE/components/RFQ/{RFQForm,RFQStatusBadge,QuoteCard,QuoteCompareTable,AttachmentUploader}.tsx` | BE-RFQ-1 | build + lint; RFQForm validates client-side to mirror R2 rules; inputs ≥16px |
| **FE-RFQ-2** | fe-builder | `Stores-FE/app/rfq/page.tsx` (full rewrite: how-it-works + post form; unauthenticated → auth modal via existing `lib/authModalBridge.ts`) | FE-RFQ-1 | Post (draft or publish) → redirect to `/account/requests/<id>`; 375–1440 OK |
| **FE-RFQ-3** | fe-builder | `Stores-FE/app/account/requests/page.tsx` (rewrite), `Stores-FE/app/account/requests/[id]/page.tsx` (new) | FE-RFQ-1, BE-RFQ-2 for award | List with status tabs; detail with specs, attachments, quote comparison (cards on mobile, table on lg), award confirm dialog (Idempotency-Key per confirm), then "Pay now" → `/checkout?order=<id>`; cancel; extend deadline |
| **ADM-RFQ** | admin-builder | `Stores-Admin/src/pages/seller/rfq/{index,MatchDetail,QuoteForm,MyQuotes}.tsx`, `Stores-Admin/src/services/sellerRfqService.ts` | ADM-0, ADM-S0, BE-RFQ-1 | shadcn only; tsc + build. Matches table (server paginated, cards under md); detail + quote form (rhf + zod); my quotes with edit/withdraw; accepted shows order link to `/seller/orders/<id>`; seller B can't see A's quote |

## 9. Risks
- Award is money-creating: one award per RFQ is enforced by the RFQ row lock **and** `UniqueConstraint(source, source_id)` on Order.
- Derived matching depends on sellers having active listings. A new seller sees no RFQs (README D8).
- Attachments are user uploads to public storage (R2). Use non-guessable paths and serve them as plain links. Malware scanning is out of scope; flag for Phase 5.
- Payment-lapse → `expired` depends on the orders sweeper (BE-ORD-1) plus the RFQ sweeper, both on beat.
