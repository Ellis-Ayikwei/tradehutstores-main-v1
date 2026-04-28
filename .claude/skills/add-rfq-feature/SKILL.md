---
name: add-rfq-feature
description: Implement or extend the RFQ (request-for-quote / reverse marketplace) feature — Django models / DRF endpoints / FE pages / Admin supplier views. Use when the user asks to "add RFQs", "build the RFQ board", "wire up quotes", or extend any RFQ behavior.
---

# Skill: add-rfq-feature

## When to use this skill

User asks to add, extend, or wire any part of the RFQ / quotes feature.

## Required reading

1. `.claude/CLAUDE.md`
2. `.claude/design-system/bid-rfq-spec.md` (RFQ section)
3. `.claude/design-system/components.md` (RFQ card recipe)
4. Stitch screens: `tradehut_rfq_board`, `tradehut_my_requests`, and the
   homepage RFQ preview block in `tradehut_homepage_1`
5. Existing BE: `apps/catalog/models.py` (Category), `apps/sellers/models.py`,
   `apps/orders/models.py`

## Vertical slice (canonical order)

### 1. Backend — `apps/rfqs/`

If the app doesn't exist yet:

```bash
cd Stores-BE && python manage.py startapp rfqs apps/rfqs
```

Then:

- Replace generated `models.py` with the spec (`RFQ`, `RFQAttachment`,
  `RFQSpec`, `Quote`, `QuoteAttachment`).
- `apps/rfqs/services.py`:
  - `create_rfq(buyer, **fields)` generates `reference` (e.g. `RFQ-{seq}`)
    and validates `closes_at > now`.
  - `submit_quote(rfq, supplier, **fields)` blocked when
    `rfq.status != "open"`. Atomically increments `rfq.quote_count`.
  - `award_quote(rfq, quote)` sets `status="awarded"`,
    `awarded_quote=quote`, marks all other quotes `rejected`. Emits
    `rfq.awarded` signal.
- `apps/rfqs/serializers.py`: `RFQListSerializer` (no full description in
  list view), `RFQDetailSerializer`, `QuoteSerializer`.
- `apps/rfqs/views.py`: `RFQViewSet` (list/retrieve/create + `award` action),
  `QuoteViewSet` nested under RFQ (submit/withdraw/shortlist).
- `apps/rfqs/urls.py`, include in root urls, register app.
- `makemigrations` + `migrate`.

### 2. Stores-FE — board + detail + my-requests

Files to create (under `Stores-FE/app/rfq/`):

- `page.tsx` — board with sidebar filters + RFQ cards. Ports
  `tradehut_rfq_board`. Two-tab toggle: **Browse** (default) and
  **Post a Request**.
- `[reference]/page.tsx` — RFQ detail with full specs, attachments, quote
  list (visible to buyer only).
- `new/page.tsx` — buyer post form.

Files under `Stores-FE/app/account/requests/`:

- `page.tsx` — buyer's RFQs with status filter. Ports `tradehut_my_requests`.

Use the **RFQ card** recipe from `components.md`. Fetch via `/api/rfqs/`.

### 3. Stores-FE — homepage preview block

The "Buyer Requests Preview" section in `tradehut_homepage_1` (lines
~464-521) shows two stacked RFQ cards as a teaser. Add it to homepage.

### 4. Stores-Admin — supplier inbox + quote submission

Files under `Stores-Admin/src/pages/supplier/rfqs/`:

- `index.tsx` — supplier's discoverable RFQs (filtered by category match).
- `[reference].tsx` — supplier's quote submission form for one RFQ.
- `my-quotes.tsx` — list of quotes the supplier has submitted with status.

### 5. Reference number generation

`RFQ.reference` is human-readable (e.g. `RFQ-9921`). Generate on save:

```python
def save(self, *args, **kwargs):
    if not self.reference:
        last = RFQ.objects.order_by("-created_at").first()
        next_seq = int(last.reference.split("-")[1]) + 1 if last else 1000
        self.reference = f"RFQ-{next_seq}"
    super().save(*args, **kwargs)
```

(For high-write production this needs a sequence — flag it.)

## Hard rules

- Suppliers see only **open** RFQs. Buyers see their own at every status.
- One quote per supplier per RFQ — enforced by `unique_together`.
- A `Quote` is immutable after `status="accepted"`. The service must check.
- Awarding generates an `Order` via the `rfq.awarded` signal — wire that
  to `apps/orders/services.create_order_from_rfq(rfq)`.

## Final report

```
Backend: <models/services/views added>
FE:      <pages added>
Admin:   <pages added>
Migrations to run: python manage.py migrate
Order auto-creation: wired | TODO
TODOs: <list>
```
