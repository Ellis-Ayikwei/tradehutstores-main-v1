---
name: add-bid-feature
description: Implement or extend the Bid (live auctions) feature — Django models / DRF endpoints / FE pages / Admin views. Use when the user asks to "add bidding", "wire up auctions", "add the auction hub page", or extend any auction-related behavior.
---

# Skill: add-bid-feature

## When to use this skill

User asks to add, extend, or wire any part of the live-auctions feature.

## Required reading

1. `.claude/CLAUDE.md`
2. `.claude/design-system/bid-rfq-spec.md` — model + lifecycle reference
3. `.claude/design-system/components.md` (auction card recipe)
4. Stitch screens: `tradehut_auction_hub`, `tradehut_bids_auctions`,
   and any auction surfaces on the homepage (`tradehut_homepage_1` "Live Floor")
5. Existing BE: `apps/products/models.py`, `apps/sellers/models.py`,
   `apps/orders/models.py`

## Vertical slice (canonical order)

Do these in order. Don't skip ahead.

### 1. Backend — `apps/bids/`

If the app doesn't exist yet, create it:

```bash
cd Stores-BE && python manage.py startapp bids apps/bids
```

Then:

- Move/replace generated `models.py` with the spec from `bid-rfq-spec.md`.
- Add `apps/bids/services.py` with `place_bid(...)`, `close_auction(...)`,
  `extend_for_anti_snipe(...)`. **All bid mutations go through services.**
- Add `apps/bids/serializers.py`: `AuctionListSerializer`,
  `AuctionDetailSerializer`, `BidSerializer`.
- Add `apps/bids/views.py`: `AuctionViewSet` (list/retrieve/create/cancel)
  + `place_bid` action.
- Add `apps/bids/urls.py`, include in project root urls.
- Register the app in `INSTALLED_APPS`.
- `python manage.py makemigrations bids && python manage.py migrate`.

### 2. Stores-FE — listing + detail

Files to create (under `Stores-FE/app/auctions/`):

- `page.tsx` — auction hub grid, ports `tradehut_auction_hub`.
- `[id]/page.tsx` — auction detail, integrates the bid form.

Files to create under `Stores-FE/app/account/bids/`:

- `page.tsx` — buyer's active bids (winning / outbid grid). Ports
  `tradehut_bids_auctions`.

Use the **auction card** recipe from `components.md`. Fetch via
`/api/auctions/?status=live` (whatever the BE wires). Use SWR (already a
dependency).

### 3. Stores-FE — homepage rail

The "Live Floor" rail in `tradehut_homepage_1` (lines ~397-462) is a
horizontal scroll of auction cards. Add it to the homepage section list.

### 4. Stores-Admin — seller's auction creation + monitoring

Add under `Stores-Admin/src/pages/seller/auctions/`:

- `index.tsx` — list of seller's auctions with status filter.
- `new.tsx` — create form (`variant`, `starting_bid`, `bid_increment`,
  `reserve_price`, `buy_now_price`, `starts_at`, `ends_at`).

### 5. Realtime (later — flag, don't build)

Bid pages need live updates. **Don't add WebSockets in this slice.** Use
SWR with `refreshInterval: 5000` for now and call out the realtime gap
in the final report.

## Hard rules

- All bid amount validation lives in `services.place_bid`. Never mutate
  `Auction.current_bid` from a serializer or view.
- Anti-snipe: if a bid arrives within `auction.soft_close_seconds` of
  `ends_at`, extend `ends_at` by the same window.
- Reserve price: `winner` is unset on `close_auction()` if the highest
  bid is below `reserve_price`.

## Final report

```
Backend: <models/services/views added>
FE:      <pages added>
Admin:   <pages added>
Migrations to run: python manage.py migrate
Realtime gap: SWR polling at 5s — WS upgrade deferred
TODOs: <list>
```
