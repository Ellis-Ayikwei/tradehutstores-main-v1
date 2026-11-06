# Plans — phase board

| File | Scope |
| --- | --- |
| `00-audit.md` | Verified audit + ranked P0 gaps |
| `10-auctions.md` | Bid Central frozen contract + tasks |
| `11-rfq.md` | RFQ frozen contract + tasks |
| `20-seller-and-checkout-gaps.md` | Shared conventions (§0), orders/payments/sellers/products/disputes/cart/notifications contracts + tasks |
| `30-fe-kinetic-migration.md` | Phase 1 Kinetic removal, FE + Admin, final token cleanup |

Rules: max **5 builders at once** across all phases. One owner per file at any time; sequential hand-offs are listed as dependencies. The reviewer (Opus) gates every task against AGENTS §8. Admin tsc gate = no new errors in touched files (baseline 858).

## Board (waves run top to bottom; tasks inside a wave run in parallel)

| Wave | Tasks (owner) | Blocked by |
| --- | --- | --- |
| **W0 — env/user** | ENV-0 (venv on Python 3.11, Postgres, Redis), WIP-0 (commit orders/users WIP), answers to D1–D16 | user |
| **W1** | BE-0 (be) · FE-LINT-0 (fe) · KIN-FE-1 (fe) · KIN-FE-2 (fe) · KIN-ADM-1 (admin) | BE-0 needs ENV-0 |
| **W2 — BE core** | BE-ORD-1 · BE-AUC-1 · BE-RFQ-1 · BE-SEL-1 · BE-PRD-1 (all be) | BE-0; ORD needs WIP-0 |
| **W3** | BE-NTF-1 + BE-USR-1 (one be) · BE-CART-1 (be) · BE-PAY-1 (be) · ADM-S0 (admin) · FE-ADDR-1 (fe) | ORD-1, PRD-1, SEL-1 |
| **W4** | BE-AUC-2 · BE-RFQ-2 · BE-DSP-1 (be) · FE-AUC-1 · FE-RFQ-1 (fe) | ORD-1, NTF-1, AUC-1/RFQ-1 |
| **W5 — buyer FE** | FE-CHK-1 · FE-ORD-1 · FE-AUC-2 · FE-AUC-3 · FE-RFQ-2 | PAY-1, ORD-1, FE-AUC-1/RFQ-1 |
| **W6** | FE-AUC-4 · FE-RFQ-3 · FE-CART-1 · FE-SELL-1 · BE-PAY-2 | AUC-2, RFQ-2, CHK-1, CART-1, DSP-1 |
| **W7 — seller (Admin)** | ADM-OVR · ADM-LST · ADM-ORD · ADM-AUC · ADM-RFQ | ADM-S0 + BE deps |
| **W8** | ADM-PAY · ADM-DSP · ADM-SET · FE-DSP-1 · FE-PLP-1 | PAY-2, DSP-1, SEL-1, PRD-1 |
| **W9** | FE-SRCH-1 · FE-PDP-1 · FE-DEALS-1 · ADM-A-ORD · ADM-A-SEL | PRD-1 (DEALS), ORD-1 |
| **W10** | ADM-A-DSP · ADM-A-PAY · KIN-FE-3..6 · KIN-ADM-2..5 (pick ≤ 5 at a time) | |
| **W11 — cleanup** | KIN-FE-Z · KIN-ADM-Z | every task touching those apps |
| **Phase 5** | reviewer: permissions/N+1 pass, D10 default-permission flip, dead-page deletions (booking/job/provider/vehicle; `apps/users/seller_views.py` + `seller_urls.py`; Stores-Admin root `admin.py/models.py/views.py/urls.py/'`), TSC-ADM burn-down, Lighthouse, deps cleanup (D13) | all |

FE-LINT-0, FE-PDP-1 and FE-SRCH-1 have no BE dependency and can be pulled forward into any wave with a free slot. FE-PLP-1 and FE-DEALS-1 need BE-PRD-1 (`free_shipping`, `seller_verified`, `sold_count`).

Critical path: ENV-0 → BE-0 → BE-ORD-1 → BE-PAY-1 → FE-CHK-1. **This is checkout. Nothing else ships money without it.** Auctions and RFQ hang off ORD-1 + NTF-1 at AUC-2/RFQ-2.

## Needs user decision (recommendation first)

| # | Decision | Recommendation |
| --- | --- | --- |
| **D1** | Recreate `Stores-BE/venv`; it points to a removed Python 3.12. Only Python 3.15 is installed, and Django/torch don't support it | Install Python 3.11 (matches Railway `nixpacks.toml`), `py -3.11 -m venv venv`, plus local Postgres + Redis for concurrency tests |
| **D2** | Auction winners: **charge at close** vs pre-authorise at bid | **Charge at close.** Paystack/MoMo (the enabled gateways) have no dependable card holds, MoMo can't pre-auth at all, holds expire before 14-day auctions, and a hold per bid kills conversion. Mitigations: only verified bidders, a 48h payment window, auto-cancel + stock release, and (P1) a strike counter. Auction/RFQ orders are online-pay only (no COD) |
| **D3** | Payment provider at launch and where secrets live | Paystack (cards + MoMo via Paystack) + COD for cart orders. Read `PAYSTACK_SECRET_KEY` from env, and stop storing `secretKey` in `StoreConfig.payments_gateways` (Phase 5: strip it from the admin config API) |
| **D4** | COD and payouts | Allow COD. The seller collects the cash, so COD orders contribute `−commission` to the payout balance (netted from online earnings) |
| **D5** | Let non-staff sellers log into Stores-Admin via `auth/admin-login/` with a `Sellers` group | Yes. BE enforces `IsSeller`/`IsStaff` on every endpoint; the FE groups are only for menus |
| **D6** | cart/payments/shipments have **no migrations**. Do the prod tables already exist? | Run `\dt carts cart_items payments shipments` on prod. If they're absent, plain migrate. If present, approve `migrate --fake-initial` for those apps **after** a schema diff |
| **D7** | `BaseModel.created_at` is `auto_now` (rewritten on every save) | Fix to `auto_now_add` in Phase 5 as one commit (AlterField migrations in every app, no SQL change). New models use `created_on` meanwhile |
| **D8** | RFQ supplier matching | Derive from the categories of the seller's active listings (no schema change). Add explicit RFQ categories later if new sellers complain |
| **D9** | "Verified bidder" definition | `UserVerification.email_verified OR phone_verified` |
| **D10** | Global DRF `DEFAULT_PERMISSION_CLASSES = AllowAny` | Flip to `IsAuthenticated` in Phase 5 after a reviewer sweep adds explicit `AllowAny` to public views |
| **D11** | New Railway **beat** service (Procfile `beat:` line). Without it auctions never close | Approve. One extra small container |
| **D12** | Commit the uncommitted orders/users WIP before Phase 2 | Commit as-is (WIP-0), so BE-ORD-1's migration builds on it cleanly |
| **D13** | Remove antd/Chakra/Mantine/HeadlessUI/FontAwesome/Emotion from Admin at the end of Phase 4 (AGENTS §9.3) | Yes, per library, only when `rg` shows zero imports. Expect it to slip past Phase 4 given the large legacy surface |
| **D14** | Multi-seller cart → one order per seller (shared payment session) | Yes. Needed for seller fulfilment, payouts and disputes |
| **D15** | Brand primary `#dc711a` gives about 3.4:1 with white text (fails AA for body text) | Keep the brand. Use white-on-primary only for large/bold labels, or darken the button shade (e.g. one step darker) for AA. The user picks during the design pass |
| **D16** | `app/compliance` copy was trimmed to remove unverified claims | Business/legal must confirm the final copy before launch |
| **D17** | **Nav lock** (`Stores-FE/components/Navigation/*`, `app/layout.tsx`, Admin `src/router/*`) | Lift it for **one** dedicated fe-builder task after W5, scoped to: (1) Bid Central `/auctions` and RFQ `/rfq` entries in TopNav/SubNav, (2) account menu items Orders / My bids / My requests / Disputes, (3) "Sell on TradeHut" → `/sell`, (4) the search bar as the dominant header control with a category rail, (5) cart badge from Redux. Admin: route **registration** only (already allowed); `Sidebar.tsx` is a layout shell (in scope) |
| D18 | Defaults: anti-snipe 120s, ending-soon 1h, auction 1h–14d, auction pay window 48h, RFQ pay window 72h, RFQ award grace 7d, payout hold 7d, checkout session 30 min | Accept as frozen. Changing them later is a constants edit |
