# 30 — Kinetic residue removal (Stores-FE + Stores-Admin) — AGENTS Phase 1

## Goal / non-goals

**Goal.** Every live page renders with plain Tailwind and existing (legacy) tokens plus the new shared primitives. After that, the Stitch/Kinetic tokens and utilities are deleted from the configs and `rg` confirms zero hits.

**Non-goals.** Functional rewiring (that lives in 10/11/20). Nav/route files (`Stores-FE/components/Navigation/*`, `app/layout.tsx`, Admin `src/router/*`). Font changes. Brand colour changes (see the contrast note). New dependencies.

## Current state (from the FE foundation builder + Admin shadcn builder reports; spot-checked)

- FE residue tokens/classes: `surface-container-*`, `on-surface*`, `primary-container`, `outline-variant`, `tertiary*`, `error-container`, `secondary-green`, utilities `.primary-gradient`, `.ghost-border`, `.glass-header`, `.no-scrollbar`, font aliases `font-headline`, `font-body`. They are defined in `Stores-FE/tailwind.config.js` and `Stores-FE/styles/globals.css`.
- FE primitives to use: `Stores-FE/components/common/marketplace/` (`ProductCard`, `ProductCardSkeleton`, `PriceTag`, `Countdown`, `ProductGrid`, `RatingStars`, `Badge`, `SectionHeader`, `cx.ts`, barrel `index.ts`).
- Admin residue: `src/components/Layouts/{Header,Sidebar}.tsx`, `Header/CurrencySwitcher.tsx`, `pages/admin/{EcommerceDashboard,CreateListing,SellerProfile,MerchandisingHomepage,OrderManagement,Search}.tsx`, `pages/admin/configurations/**`, `pages/admin/AdsManagement/**`, `pages/admin/PromosManagement/**`. Tokens defined in `Stores-Admin/tailwind.config.cjs` / `src/tailwind.css` (+ Material Symbols import).
- Admin component system: `src/components/shadcn/*` (incl. `data-table` with server pagination/sort/search + mobile cards, `stat-card`, `page-header`, `empty-state`, `sonner`). See `Stores-Admin/docs/ui-system.md`.
- **Admin tsc baseline: 858 pre-existing errors.** The Admin gate everywhere in these plans is "`npx tsc --noEmit` reports **no errors in files you touched**, and the total count does not increase" plus `npm run build` passing.

## Mapping rule (all tasks)

Replace each Stitch token with the nearest **existing legacy token** or a Tailwind neutral (`bg-white`, `bg-zinc-50/100`, `text-zinc-900/600/500`, `border-zinc-200`, brand `primary`/`emerald` as already used by `app/checkout/page.tsx`). Where a legacy token is missing, add it to the tailwind config rather than hard-coding hex. That addition goes to the **final cleanup task only**: earlier tasks list the needed token in their report and use the nearest neutral meanwhile. Gradients → solid brand colour. `.no-scrollbar` → keep behaviour via `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` arbitrary variants. `font-headline` → the existing Syne class (`font-syne` alias stays until cleanup), `font-body` → default sans.

Per-task acceptance (FE): `rg -n "surface-container|on-surface|primary-container|outline-variant|tertiary|error-container|secondary-green|primary-gradient|ghost-border|glass-header|no-scrollbar|font-headline|font-body|material-symbols" <owned files>` → 0 hits. `npm run build` + `npm run lint` pass. Check at 375/768/1024/1440 with no horizontal scroll. No antd introduced. Copy and behaviour are unchanged.

## Pages owned by functional tasks (strip Kinetic there; do NOT create separate tasks)

`app/checkout` (FE-CHK-1), `app/account/addresses` (FE-ADDR-1), `app/account/orders/**` (FE-ORD-1), `app/account/disputes` (FE-DSP-1), `app/account/bids` (FE-AUC-4), `app/account/requests/**` (FE-RFQ-3), `app/auctions/**` (FE-AUC-2/3), `app/rfq` (FE-RFQ-2), `app/sell` (FE-SELL-1), `app/search` (FE-SRCH-1), `app/deals` (FE-DEALS-1), `app/products/[id]` (FE-PDP-1). Their acceptance **adds** the rg check above.

## FE tasks (fe-builder; disjoint; P0 groups first)

| ID | Pri | Files (exclusive) | Notes |
| --- | --- | --- | --- |
| **KIN-FE-1** | P0 | `app/account/layout.tsx`, `app/account/page.tsx`, `app/account/payment-methods/page.tsx`, `app/account/verification/page.tsx`, `app/account/profile/page.tsx`, `app/account/security/page.tsx` | Account shell first. `payment-methods`: remove the mock "add card" form, show "Payment is handled securely by Paystack at checkout; no cards are stored" (no PAN fields; audit §2(a)) |
| **KIN-FE-2** | P0 | `app/auth/**` (login, register, forgot-password) | Do not change auth logic or `react-auth-kit` usage |
| **KIN-FE-3** | P1 | `app/account/{reviews,messages,notifications,wishlist,invite,reports}/page.tsx` | |
| **KIN-FE-4** | P1 | `app/help/page.tsx`, `app/returns/page.tsx`, `app/trust/page.tsx`, `app/buyer-protection/**` (if residue), `app/seller/disputes/page.tsx` | seller/disputes: static content only (seller tooling lives in Admin) |
| **KIN-FE-5** | P2 | `app/about/**`, `app/blog/**`, `app/market-reports/**`, `app/legal/**`, `components/Blog/BlogNewsletterSignup.tsx` | |
| **KIN-FE-6** | P1 | `components/Modal/UploadModal.tsx`, `components/Promo/SellerPromosStrip.tsx` | shared components; check every importer still renders |
| **KIN-FE-Z** | last | `Stores-FE/tailwind.config.js`, `Stores-FE/styles/globals.css` | Runs after every FE task above **and** the functional tasks. Delete the Stitch colour families, `.primary-gradient/.ghost-border/.glass-header/.no-scrollbar`, the `font-headline/font-body` aliases and any Material Symbols import; add missing legacy tokens reported by earlier tasks. Acceptance: `rg -il "kinetic\|surface-container\|on-surface\|primary-container\|outline-variant\|error-container\|secondary-green\|primary-gradient\|ghost-border\|glass-header\|font-headline\|font-body\|material-symbols" Stores-FE --glob '!node_modules' --glob '!.next'` → 0; build + lint pass |

`app/compliance/page.tsx`: content was trimmed by the foundation builder to copy with no unverified claims. **Business-copy confirmation needed** (README D16) before launch. No builder task beyond that.

## Admin tasks (admin-builder; seller-facing first)

| ID | Pri | Files (exclusive) | Notes |
| --- | --- | --- | --- |
| (ADM-S0, see 20) | P0 | `components/Layouts/Sidebar.tsx`, `components/Layouts/DefaultLayout.tsx` | ADM-S0 also strips Kinetic from Sidebar and **mounts `<Toaster />` from `@/components/shadcn/sonner` once in `DefaultLayout.tsx`**. No other task mounts a Toaster |
| (ADM-OVR, see 20) | P0 | `pages/seller/overview/*` | new seller overview built from scratch with `stat-card`; `EcommerceDashboard` stays admin-only (KIN-ADM-3) |
| (ADM-LST, see 20) | P0 | + `pages/admin/CreateListing.tsx` | ADM-LST owns CreateListing too. If no route imports it after the seller wizard lands, mark it for reviewer-confirmed deletion; otherwise migrate it to shadcn |
| (ADM-A-ORD, see 20) | P0 | `pages/admin/OrderManagement/index.tsx` | functional + Kinetic in one pass |
| (ADM-A-SEL, see 20) | P0 | `pages/admin/SellerProfile.tsx`, `SellerManagement/index.tsx` | functional + Kinetic in one pass |
| **KIN-ADM-1** | P0 | `components/Layouts/Header.tsx`, `components/Layouts/Header/CurrencySwitcher.tsx` | layout shell (in scope); no route changes |
| **KIN-ADM-2** | P1 | `pages/admin/MerchandisingHomepage.tsx`, `pages/admin/Search/**` (incl. `Search.tsx` if present) | |
| **KIN-ADM-3** | P1 | `pages/admin/EcommerceDashboard.tsx` | keep the chart lib it already uses |
| **KIN-ADM-4** | P1 | `pages/admin/configurations/**` | big; may be split by `tabs/*` subfolders if the builder reports > 1500 lines |
| **KIN-ADM-5** | P1 | `pages/admin/AdsManagement/**`, `pages/admin/PromosManagement/**` | |
| **KIN-ADM-Z** | last | `tailwind.config.cjs`, `src/tailwind.css`, `index.html` (Material Symbols link if there) | after all Admin tasks: remove Kinetic tokens, `.glass-header/.primary-gradient/.no-scrollbar`, the Material Symbols import. `rg -il "kinetic\|glass-header\|primary-gradient\|no-scrollbar\|material-symbols" Stores-Admin/src Stores-Admin/index.html` → 0; build passes; tsc count ≤ baseline |
| **TSC-ADM** | ongoing | report only: `Stores-Admin/docs/tsc-baseline.txt` (new; error count per file) | Records the 858-error baseline per file at Phase 1 start, then refreshes it after each Admin wave. Errors are fixed only inside files a task owns; a dedicated Phase 5 task burns down the rest |

Admin per-task acceptance: no antd/Chakra/Mantine/HeadlessUI/FontAwesome/Emotion imports in touched files; no new tsc errors in touched files; `npm run build` passes; tables collapse to cards under `md`.

## Risks / notes
- **Contrast**: brand primary `#dc711a` with white text is about 3.4:1, which fails WCAG AA for body text (it passes only for ≥ 24px or bold ≥ 18.66px). Builders must not change the brand colour. Use white-on-primary only for large/bold labels, or dark text on primary. README D15 asks the user.
- Phase 1 overlaps Phase 2/3: functional tasks own their pages (above), so no file has two owners. KIN-FE-Z / KIN-ADM-Z must wait for **all** of them.
- Shared FE components (`UploadModal`, `SellerPromosStrip`) are imported by pages owned by other tasks. Their importers must not edit these files.
