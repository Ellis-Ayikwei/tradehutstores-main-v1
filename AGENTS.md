# TradeHut Stores 2.0 — Agent Operating Manual

**Goal: ship to production.** Functionality first, a modern marketplace feel second,
cleverness never. The target UX is **Amazon's trust and search/checkout efficiency
merged with AliExpress's deal density and visual energy** — on a mobile-first base.

> **Precedence:** this file supersedes `.claude/CLAUDE.md` wherever they conflict.
> The "Kinetic" redesign is **cancelled**; its agents, skills and mockups were
> deleted (see §11) and its code residue is removed in Phase 1.
> `.claude/CLAUDE.md` has been reduced to a pointer to this file.

---

## 1. Repo map

| Path | Stack | Role |
| --- | --- | --- |
| `Stores-FE/` | Next.js 15 App Router, React 18, Tailwind v3, Redux Toolkit, SWR, axios | Public marketplace (buyers + public seller pages) |
| `Stores-Admin/` | Vite + React 18 + TS, Tailwind v3, React Router | Admin and **seller** dashboards |
| `Stores-BE/` | Django + DRF, Celery, Postgres (pgvector), apps in `Stores-BE/apps/` | API, auctions, RFQ, orders, payments |

Current state worth knowing:
- **BE has no Auction/Bid/RFQ/Quote models.** Only `store.storefront_show_auctions/rfq` toggles exist. Bid + RFQ are greenfield on the backend.
- **FE** `app/auctions/page.tsx` (783 lines) and `app/rfq/page.tsx` (757 lines) are static Kinetic mockups with no real data wiring.
- **Admin** mixes antd, Chakra, Mantine, Headless UI and FontAwesome. No shadcn yet. Large inherited surface (`pages/admin/*`, plus unrelated "booking/job/provider" leftovers).
- Kinetic residue: `Stores-FE/tailwind.config.js`, `Stores-FE/styles/globals.css`, `Stores-Admin/src/tailwind.css`, `Stores-FE/app/{auctions,rfq,deals,compliance}`, `Stores-FE/components/Products/ProductFilters.tsx`, and Admin `DefaultLayout`, `ConfigPrimitives`, `EcommerceDashboard`, `OrderManagement`.
- Uncommitted work exists in `Stores-BE/apps/{orders,users}` (+ `address_*.py`). **Never revert or reformat files you weren't assigned.**

---

## 1b. Business facts and content rules (apply to every agent, every file)

**Single source of truth for contact details.** Use exactly these, everywhere a phone number or business location is shown:
- **Phone:** `0248138722` — display as `024 813 8722`; link as `tel:+233248138722`; WhatsApp as `https://wa.me/233248138722`.
- **Location:** **La Trade Fair, Accra, Ghana** (the business is based at La Trade Fair). For map embeds/links, search by the text `La Trade Fair, Accra, Ghana` — **never invent street addresses, GPS coordinates, postcodes, opening hours, registration numbers or other business facts.** If a design needs a fact we don't have, omit that element.
- Do not add other phone numbers or addresses. A form field's *input placeholder* (e.g. "Enter your phone") is not a business phone and may stay, but must not contain a made-up real-looking number.

**No dummy content in anything user-visible.** No lorem ipsum, fake names/testimonials/reviews, fake stats ("40+ regulators", "99.9% uptime", "24 orders / 4.8 rating"), hardcoded demo products, fake activity logs, fake order/tracking numbers, `example.com` emails, placeholder images from Unsplash/placeholder services shown as if real, or sample data fallbacks that make an empty/failed API look populated. Where real data is absent, render a proper **empty state** (or hide the section). Never "fix" missing data by inventing it. If a feature has no backend yet, say so in the report rather than faking it in the UI.

**Premium solid look — no translucent or glassy surfaces.** Icon chips/containers, avatars, badges, buttons, cards, chips and nav items use **solid** background colors from the palette (e.g. `bg-primary-50`, `bg-zinc-100`, `bg-white`, `bg-zinc-900`), never opacity/alpha backgrounds (`bg-primary/10`, `bg-white/20`, `bg-black/5`), `bg-opacity-*`, `bg-transparent` chips, or `backdrop-blur`/glassmorphism. Pick a solid tint that has the contrast you'd have gotten from the alpha version. Allowed exceptions only: the dim scrim behind modals/sheets (`bg-black/50`), and dark gradient overlays on photos that are needed for text legibility. Same rule for borders/rings: prefer solid `border-zinc-200`-style colors over `border-white/10`.

---

## 2. Model routing (the core rule)

**Opus thinks. Sonnet types.** Spawn the cheapest agent that can do the job correctly.

| Work | Model | Agent |
| --- | --- | --- |
| Architecture, API contracts, data models, task breakdown, sequencing | **Opus** | `lead-architect` |
| Anything concurrency/money/permissions: bid placement, auction close, escrow/payment, RFQ award, seller payouts, auth scopes | **Opus designs → Sonnet implements → Opus reviews** | `lead-architect`, builders, `reviewer` |
| Diff review, merge gate, debugging a failure that survived one fix attempt | **Opus** | `reviewer` |
| Django models/serializers/views/tests from an approved contract | **Sonnet** | `be-builder` |
| Next.js pages/components from an approved contract | **Sonnet** | `fe-builder` |
| Admin/seller pages with shadcn/ui from an approved contract | **Sonnet** | `admin-builder` |
| Searching, listing, grep sweeps, "where is X used" | **Sonnet/Explore** | `Explore` |

Escalation rules:
- Sonnet agent stuck after **2 failed attempts** at the same error → stop, report to the orchestrator, route to `reviewer` (Opus). No third blind retry.
- Sonnet must **not** invent API shapes. If the contract is missing a field, ask the orchestrator; Opus amends the contract.
- Opus must **not** write bulk UI code. If Opus finds itself producing JSX for more than a snippet, hand it to a builder.

---

## 3. Orchestration protocol

The main session is the **orchestrator**. It owns the plan, spawns agents, merges results, and talks to the user.

1. **Plan first (Opus).** `lead-architect` writes plans/contracts to `.claude/plans/<phase>-<slug>.md`: scope, files owned, endpoint contracts (method, path, request, response, errors), acceptance checks. Builders read the plan, not the chat.
2. **Fan out (Sonnet), in parallel, by disjoint file ownership.** Every task states the exact files/folders it may touch. Two agents never own the same file. Use `isolation: "worktree"` for any batch of 3+ concurrent builders touching the same app.
3. **Vertical slices, not layers.** One slice = BE endpoint + FE/Admin screen + test, so a feature is demoable when it lands. Order inside a slice: BE contract → BE → client → UI.
4. **Gate (Opus).** `reviewer` checks every slice against its plan and the checklist in §8 before it counts as done. Failed review → back to the same builder with specific findings.
5. **Report.** Each agent returns: files changed, commands run + results, deviations from plan, open questions. No narration.

Agent-on-agent rule: builders do **not** spawn further agents. Only the orchestrator and `lead-architect` fan out. Keep concurrency to what you can review — **max 5 builders at once**.

---

## 4. Product scope and priorities

Order of value. Don't start a lower tier while a higher tier is broken.

**P0 — must work at launch**
1. Auth (buyer/seller/admin), address book, cart, checkout, payments, orders, order tracking.
2. Seller side: onboarding/verification, create/edit listing (incl. variants, inventory, shipping), orders to fulfil, payouts view, disputes/returns.
3. **Bid Central (auctions):** browse, watch, place bid, outbid/winning states, close, winner order.
4. **RFQ:** buyer posts request, suppliers quote, buyer awards, order created.
5. Search + category browse + product detail that converts.

**P1 — before or right after launch:** reviews, wishlist, deals/flash sales, notifications, messaging, help center.

**P2 — defer:** blog, market reports, invite friends, anything cosmetic.

### Bid Central rules (design with Opus, no shortcuts)
- Bid placement is a single `transaction.atomic()` with `select_for_update()` on the auction row. No read-then-write races.
- Server is the clock. Clients display a countdown from `ends_at` + server-time offset; never trust client time.
- Validate: auction live, bidder ≠ seller, amount ≥ `current_price + min_increment`, bidder verified, idempotency key per request.
- Anti-sniping: bid inside the last N minutes extends `ends_at` (configurable on the auction).
- Closing is a **Celery task** scheduled at `ends_at` plus a periodic sweeper as a safety net. Closing is idempotent. Winner → pending order via the existing `orders` app.
- Reserve price and buy-now are supported; **proxy/auto-bidding is out of scope for v1.**
- "Realtime" = **SWR polling** (2–5s while the auction page is visible, back off otherwise). No websockets/Channels in v1.
- Statuses the UI must render: `scheduled`, `live`, `ending_soon`, `ended`, `cancelled`; per-user `winning`, `outbid`, `won`, `lost`.

### RFQ rules
- States: `draft → open → quoting → awarded → closed|cancelled|expired`. Suppliers see only RFQs matching their categories; quotes are private to buyer + that supplier.
- Awarding creates an order and notifies all quoters. One award per RFQ.
- Spec starting point: `.claude/design-system/bid-rfq-spec.md` — `lead-architect` must **validate it against the current schema first** and may rewrite it. Then it's frozen into the phase plan.

---

## 5. Frontend rules (Stores-FE)

- **Tailwind utilities only.** No CSS modules, CSS-in-JS, or new UI-kit components. Shared patterns via `@apply` under `@layer components` in `styles/globals.css`, or small local components.
- **Mobile-first**: write base styles for 375px, then `sm: md: lg: xl:`. Verify 375 / 768 / 1024 / 1440. No horizontal scroll at any width. Tap targets ≥ 44px, inputs ≥ 16px font (no iOS zoom).
- **Marketplace UX standard (Amazon × AliExpress):**
  - Dense, scannable product grids (2-col mobile → 4–6-col desktop); price, strike-through, discount %, rating+count, shipping/arrival, seller badge, stock/"X sold".
  - Persistent search as the primary control; filters in a bottom-sheet on mobile, left rail on desktop; sort + result count; sticky "Add to cart / Buy now / Place bid" bar on mobile PDP.
  - Trust signals everywhere: buyer protection, verified seller, returns, secure payment.
  - Deal energy: flash-sale countdowns, coupon chips, "limited stock", recently viewed, recommendations rows.
  - Skeleton loaders, empty states, and error states for every data view. Optimistic UI for cart/wishlist/bid.
- **Amazon-level density and visual hierarchy (applies to product cards, PDP, cart, ads, lists):**
  - Hierarchy order on a card: **image → price → title → rating → delivery/stock**. Price is the strongest text element: currency symbol small, whole amount large and bold, decimals small/superscript; list price struck through in muted grey; discount as red `-23%` text (solid red badge only for time-limited deals). Title: 14px/`leading-snug`, 2 lines max (`line-clamp-2`), dark neutral, hover underline + brand colour. Rating: stars + review count in link colour, one line. Delivery/stock lines (`Free delivery`, `Only 3 left`, `In stock`) only from real data.
  - Spacing scale (mobile → desktop): page gutters `px-3 sm:px-4 lg:px-6`; section gaps `space-y-3 lg:space-y-4`; card padding `p-2 sm:p-3`; grid gaps `gap-2 sm:gap-3`; divider lines (`border-zinc-200`) instead of big whitespace to separate blocks; no block taller than its content needs.
  - Images: **grid product cards** use a borderless square `aspect-square` grey stage (`bg-zinc-100 dark:bg-zinc-800`) with the photo `object-contain` + small padding and `mix-blend-multiply dark:mix-blend-normal`, so cards stay uniform (USER reference: Amazon grid screenshot). **List rows** use a 160px (240px at md) grey square stage, also `object-contain`. The PDP gallery and lightbox keep `object-contain`. Always a fixed ratio (no layout shift), `next/image` with `sizes`; never stretch or distort. Grid cards have no box and no Add-to-cart button; list rows have the Add-to-cart pill; colour swatches (when 2+ colours) let buyers switch variant on the card.
  - Image delivery: the site is deployed on Cloudflare Pages via next-on-pages where the default Next image optimizer is unavailable/slow; `next/image` uses the custom loader in `Stores-FE/lib/imageLoader.ts` (direct CDN URL, or Cloudflare image transformations when `NEXT_PUBLIC_IMAGE_TRANSFORM_BASE` is set). Never route images through `/_next/image`.
  - Buttons: Add to cart = solid brand (`bg-primary-700 text-white`, fully rounded pill, 44px mobile / 36px dense desktop); Buy now = solid dark (`bg-zinc-900 text-white`); secondary = white with `border-zinc-300`. One clear primary action per block.
  - PDP: desktop 3-zone layout (gallery | title/price/options/about | sticky buy box); mobile single column with sticky bottom action bar. Cart: items list left, sticky subtotal + checkout card right (mobile: subtotal + checkout first). Ads: reserved aspect ratio, a small grey "Sponsored" label, solid caption panel, never push content on load.
  - No fake social proof: "bought in past month", "Prime"-style badges, countdowns, urgency or discounts appear only when the API provides the underlying data.
- **Anti-"AI slop" rules (the user wants the Amazon way: utilitarian, dense, trustworthy):** no gradients (except photo-legibility scrims), no decorative icon-in-circle/icon-in-rounded-square chips, no emoji in UI, no hover scale/lift on cards, no large soft shadows (`shadow-sm` max on cards; none on flat panels), no marketing fluff copy ("Discover", "Elevate", "Seamless"), no oversized radii — cards/panels `rounded-md` (6px), inputs/buttons `rounded-md`, only CTAs/chips/avatars may be `rounded-full`, max one accent colour per block, text links in link colour instead of buttons where Amazon would use a link, icons only where they carry meaning (cart, search, wishlist, location), consistent type scale 12/13/14/16/20/24 (no arbitrary px), borders and dividers instead of floating cards, no letter-spaced uppercase micro-labels. When in doubt, copy Amazon's information density and hierarchy, not its logo.
- **Flat solid surfaces everywhere (no transparency):** icons, icon buttons, badges, notification dots/bells/toasts/popovers/dropdowns/tooltips/sticky bars must use solid colours — never `bg-*/NN`, `bg-opacity-*`, `backdrop-blur`, translucent borders or `opacity-*` used to fake a tint. The ONLY allowed alpha is the modal scrim (`bg-black/50`) and photo-legibility gradients. Disabled states use solid muted colours, not `opacity-50`.
- **Theme boot (Stores-FE + Admin):** the DEFAULT theme is LIGHT. Dark is used only when the user explicitly chose it with the toggle (stored in localStorage); never infer dark from the OS unless the user picked "System". The theme class must be applied by a tiny blocking inline script in `<head>` BEFORE first paint so there is no flash and no late re-theming after hydration; React providers read the same storage key and must not re-apply a conflicting default.
- **Theme-aware (light + dark) is mandatory for every Stores-FE page/component.** The site uses Tailwind `darkMode: 'class'` (html gets `dark`/`light`; the nav and layout already follow it). Never ship light-only surfaces: every background, text, border, divider and shadow needs a `dark:` counterpart, using **solid** colours (e.g. `bg-white dark:bg-zinc-900`, page `bg-zinc-100 dark:bg-zinc-950`, stage `bg-zinc-50 dark:bg-zinc-800`, text `text-zinc-900 dark:text-zinc-100`, muted `text-zinc-500 dark:text-zinc-400`, borders `border-zinc-200 dark:border-zinc-800`, links `text-primary-700 dark:text-primary-400`, primary buttons stay `bg-primary-700 text-white`). Semantic text colours (red price/discount, green in-stock, amber low-stock) need dark-readable shades (`text-red-600 dark:text-red-400`). Verify contrast (≥4.5:1) in both themes; check images on dark (no pure-white boxes around transparent PNGs — use the theme stage colour). Define repeated pairs as `@apply` components only if truly shared. Admin follows its own `html.dark` theme via the shadcn CSS variables.
- Use `next/image` with explicit sizes, `loading="lazy"` below the fold, `next/link` for navigation, server components by default, `"use client"` only where needed.
- Data: SWR for reads, axios instance in `lib/` for writes. Redux Toolkit only for cross-page state that already lives there (cart/auth). Don't add state libraries.
- Keep **fonts** (Syne / DM Sans / JetBrains Mono). Icons: `lucide-react` (already present). Do not add Material Symbols or other icon fonts.
- **Do not touch** `components/Navigation/*` or route/layout wiring (`app/layout.tsx`) without the user lifting the lock — see §9.
- Legacy `antd` stays only on pages not yet touched. **Never import antd into a page you rewrite.**

## 6. Admin / Seller rules

> **USER DECISION: the seller dashboard lives in the STOREFRONT (Stores-FE) at `/seller-central`, not in Stores-Admin.** Sellers manage their store (overview, listings + option-types wizard, orders, settings/verification, auctions, RFQ, payouts, disputes) in Stores-FE under `app/seller-central/**`, styled with the storefront rules (§5: Tailwind only, Amazon density, flat solid, theme-aware). Stores-Admin is **staff-only** (seller review queue, catalog value requests, platform ops). Do not add new seller-facing screens to Stores-Admin; the existing `Stores-Admin/src/pages/seller/**` is legacy reference until it is removed. `NEXT_PUBLIC_ADMIN_URL` is no longer needed by the storefront.

### Stores-Admin (staff) specifics

- **shadcn/ui on Tailwind v3** is the component system for every page you build or rewrite. Setup is one task for `admin-builder`, done once, in Phase 0:
  - **Windows is case-insensitive and `src/components/ui/` already has `Button.tsx`, `Card.tsx`, `Tabs.tsx`** — shadcn's `button.tsx`/`card.tsx`/`tabs.tsx` would overwrite them. Install shadcn into **`src/components/shadcn/`** (set `components.json` `aliases.ui` to `@/components/shadcn`). Never edit the legacy `components/ui/*` while pages still import it.
  - Use a shadcn CLI/config compatible with **Tailwind v3 + Vite** (not the v4 variant). Add `components.json`, `src/lib/utils.ts` (`cn` via `clsx` + `tailwind-merge`), `@/` path alias in `tsconfig.json` and `vite.config.ts`, CSS-variable theme in `src/tailwind.css`.
  - New deps allowed for this: `tailwindcss-animate`, `class-variance-authority`, `tailwind-merge`, the needed `@radix-ui/*`, `sonner`, `@tanstack/react-table`, `react-hook-form` + `zod` (+ resolver). Anything beyond that → flag first.
  - `clsx` already installed. `lucide-react` is the icon set.
- **Migration policy:** page-by-page. A page is "migrated" when it imports **none** of antd / Chakra / Mantine / Headless UI / FontAwesome / Emotion. Only after the last page using a library migrates does a final cleanup task remove it from `package.json`. Never remove a dep while anything imports it.
- **Seller dashboard comes before admin-only screens.** Seller P0 pages: Overview (sales, orders to ship, low stock, payout), Listings (table + create/edit wizard), Orders (list, detail, ship/tracking), Bids & Auctions (my auctions, live bids, results), RFQ (matching requests, my quotes), Payouts, Disputes/Returns, Store settings.
- Dashboards are **mobile-first too**: tables collapse to cards under `md`, sidebar becomes a sheet, forms are single-column on mobile with a sticky action bar.
- Data tables: server-side pagination/filter/sort against DRF, column visibility, empty/loading/error states. No client-side loading of full collections.
- Keep **Charlie** font. Charts: one library only (keep `react-apexcharts` or `chart.js` — pick the one already used on the Overview page; do not add a third).
- Do not touch `src/router/*` or `src/routes.tsx` structure except to **register** a new page following the existing pattern. Layout shells (`components/Layouts/`) are in scope.
- Delete dead pages that belong to unrelated products (booking/job/provider/vehicle/service-request leftovers) **only** when `reviewer` confirms nothing routes to them. Deletions are their own commit.

## 7. Backend rules (Stores-BE)

**DB safety (hard rule).** `Stores-BE/.env` has `DATABASE_URL` pointing at a **Railway-hosted Postgres** (treat as live). `manage.py` contains a guard (`_guard_remote_database`) that refuses write commands against a non-local host, but **the user has disabled the call** (commented out in `main()`), so nothing technical stops you — the rule is yours to keep: never run migrate, test, shell, runserver, loaddata, seed/populate commands or anything that writes against the Railway database; set `DATABASE_URL` to a local database in the same command, and only run a command against Railway when the user explicitly asks for that specific command. `makemigrations` (file generation) is fine. The venv is `Stores-BE/.venv` (Python 3.11, installed without torch/transformers). The old tracked `Stores-BE/venv` is dead.

- Inherit `apps.core.models.BaseModel`. New domains get their own app: `apps/auctions/`, `apps/rfq/` (register in `INSTALLED_APPS`, `backend/urls.py`).
- DRF: thin views, logic in `services.py`, serializers validate. Explicit permission classes on every viewset — **no default-open endpoints**. Sellers only see their own rows (queryset scoping, not just frontend hiding).
- Money: `DecimalField` + currency code; never float. Compare/aggregate in the DB.
- Every write endpoint that can be retried (bid, checkout, award) takes an **idempotency key**.
- Migrations: one per change set, never edit an applied migration, never `--fake` without asking. Check `git status` first — uncommitted model edits exist in `orders` and `users`; coordinate, don't overwrite.
- Tests: each service function with a money or state-transition rule gets a test (`manage.py test <app>`). Bid placement needs a concurrency test (two simultaneous bids → exactly one wins at a given price).
- Pagination on every list endpoint; `select_related/prefetch_related` on anything serialized with relations. No N+1.
- Secrets/env only via settings/env vars. Never log tokens, card data, or addresses.

## 8. Definition of done (reviewer checklist)

A slice is done only when **all** are true — report evidence, not assertions:

- [ ] Matches the phase plan/contract; no unrequested features or abstractions.
- [ ] BE: `python manage.py check` clean; migrations generated and applied locally; tests pass.
- [ ] FE: `npm run build` and `npm run lint` pass (Stores-FE). Admin: `npx tsc --noEmit` and `npm run build` pass.
- [ ] Works at 375 / 768 / 1024 / 1440 with no horizontal scroll; keyboard reachable; images have alt; contrast OK.
- [ ] Loading, empty, error states exist. Failed API calls show a message, not a blank screen.
- [ ] No raw hex colors, no new fonts, no banned libraries on migrated files, no `console.log`, no commented-out code, no stray `any` in new TS.
- [ ] §1b holds: only the official phone and La Trade Fair location, no dummy content, no translucent/glass backgrounds on icons, badges, chips, buttons or cards.
- [ ] Permissions: a seller cannot read/modify another seller's data; a buyer cannot reach seller/admin endpoints.
- [ ] The golden path of the feature was exercised end-to-end (run it — don't just compile it). If it couldn't be run, say so.

## 9. Open decisions — ask the user, don't assume

1. **Nav lock.** CLAUDE.md reserves nav/route files to the user. An Amazon×AliExpress feel hinges on the header, search bar and category rail. Until the user says otherwise, builders leave `components/Navigation/*` and Admin `router/*` alone and the architect lists the nav changes needed as a request.
2. **Payments/payouts provider** behavior for auction winners (charge at close vs. pre-authorise at bid). Opus proposes; the user decides.
3. **Admin deps cleanup** — OK to remove antd/Chakra/Mantine entirely at the end of Phase 4?

---

## 10. Execution phases

Run phases in order; slices inside a phase fan out in parallel.

| Phase | Lead | Work |
| --- | --- | --- |
| **0. Foundations** | Opus `lead-architect` → Sonnet | Audit + plan; shadcn setup in Admin; confirm env runs (`check`, both builds); freeze Bid/RFQ contracts. Output: `.claude/plans/` |
| **1. Kinetic removal** | Sonnet builders, Opus review | Per-file: strip Kinetic classes/tokens/Material Symbols from the files in §1, replace with plain Tailwind + existing tokens, keep legacy tokens (back-compat) until `grep -ri kinetic` hits zero in app code. Remove `.kinetic-gradient`, Stitch-only color families, the Material Symbols import. |
| **2. Backend core** | Opus designs, `be-builder` implements | `auctions` + `rfq` apps, services, endpoints, Celery close task, tests. Then fill gaps found in checkout/orders/payouts/addresses. |
| **3. Buyer FE** | `fe-builder` ×N (one per page) | Home, search/category, PDP, cart, checkout, account/orders, **Bid Central** (hub + auction detail), **RFQ** (post, my requests, quotes), deals. |
| **4. Seller + Admin** | `admin-builder` ×N | Seller dashboard P0 list (§6), then admin ops (orders, disputes, users, sellers, catalog). |
| **5. Hardening + launch** | Opus `reviewer` | Security/permissions pass, N+1/perf pass, Lighthouse mobile on key pages, remove retired assets (§11), dependency cleanup, DEPLOYMENT.md smoke test. |

Phase 1 can overlap Phase 2 (different folders). Phase 3 slices start per feature as its BE contract is merged.

## 11. Removed (recoverable via git history)

Already deleted: agents `fe-redesigner`, `admin-redesigner`, `screen-porter`, `bid-rfq-architect`; skills `port-stitch-page`, `apply-design-tokens`, `restyle-component`; docs `.claude/design-system/{tokens,components,layouts,screens-map,responsive}.md`; the whole `stitch_full_website_redesign_expansion/` folder.

Still present and **stale**: skills `add-bid-feature` / `add-rfq-feature` reference Kinetic. Use only their functional steps as input to `lead-architect`; ignore their styling guidance. Design source for UI is now AGENTS.md §5–6, not mockups.

## 12. Commands (Windows / PowerShell)

| Action | Command |
| --- | --- |
| FE dev / build / lint | `cd Stores-FE; npm run dev` · `npm run build` · `npm run lint` |
| Admin dev / build / typecheck | `cd Stores-Admin; npm run dev` · `npm run build` · `npx tsc --noEmit` |
| BE run | `cd Stores-BE; .\.venv\Scripts\Activate.ps1; $env:DATABASE_URL='postgresql://USER:PASS@localhost:5432/tradehut_dev'; python manage.py runserver` |
| BE check / test | `python manage.py check` · `$env:DATABASE_URL='<local url>'; python manage.py test <app>` |
| BE migrate | `python manage.py makemigrations <app>; python manage.py migrate` (local DB only — see §7 DB safety) |
| Kinetic residue | `rg -il kinetic Stores-FE Stores-Admin/src --glob '!node_modules'` |

## 13. Global do / don't

- **Do** make the smallest change that meets the plan. Reuse what exists. Fix root causes.
- **Do** commit per slice with a clear message; never `push --force`, `reset --hard`, or `rm -rf` (denied in settings anyway).
- **Don't** add dependencies silently (flag them, one line each: name, why, size).
- **Don't** add abstraction layers, feature flags, generic "frameworks", or config for hypothetical needs.
- **Don't** change fonts, rewrite nav, or touch files outside your assigned ownership.
- **Don't** mark anything done on a failing build. Say what failed and with what output.
- **Never run DB-touching `manage.py` commands** (`test`, `migrate`, `shell`, `runserver`, `loaddata`, `flush`, `createsuperuser`, seeds) or `pytest` against the `DATABASE_URL` in `Stores-BE/.env` — it is Railway-hosted and treated as live. Read `manage.py` and the agent files before running anything backend. Set `DATABASE_URL` to a local database in the same command, or write the test/migration without running it and say so. Only the user may approve a run against the remote DB. These commands are in `ask` in `.claude/settings.json`; if a prompt appears, check the DB target before answering.
- **Never read `.env` files** (`Stores-BE/.env`, `Stores-FE/.env*`, `Stores-Admin/.env*`) — not with Read, Grep, `cat`, `rg`, `Get-Content`, or any other way, not even "just the names". They hold secrets. Read `.env.example` instead; to learn a value, ask the user. When a new variable is needed, add it (commented) to `.env.example` and tell the user the name to put in their own `.env`. Enforced by deny rules in `.claude/settings.json`.
