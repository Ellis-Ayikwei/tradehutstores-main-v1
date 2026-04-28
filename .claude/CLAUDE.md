# TradeHut Stores 2.0 — Project Guide

Three-app monorepo migrating to a new "Kinetic" design language defined in
[`/stitch_full_website_redesign_expansion/`](../stitch_full_website_redesign_expansion/).

## Apps

| Path | Stack | Purpose |
| --- | --- | --- |
| [Stores-FE/](../Stores-FE/) | Next.js 15 (App Router), React 18, Tailwind v3, Redux Toolkit | Public marketplace |
| [Stores-Admin/](../Stores-Admin/) | Vite + React 18, Tailwind v3 | Seller / admin dashboards |
| [Stores-BE/](../Stores-BE/) | Django, DRF | API + DB. Apps under [Stores-BE/apps/](../Stores-BE/apps/) |

## Active migration: "Kinetic" redesign

The full new UI is defined as static HTML in
[`stitch_full_website_redesign_expansion/`](../stitch_full_website_redesign_expansion/).
Each subfolder = one screen with a `code.html` and a `screen.png` reference.
Migrating these to React across **Stores-FE** and **Stores-Admin** is the dominant
work stream. New features in the redesign:

- **Bid / Auctions** — live auctions, "winning/outbid" states, time-to-close
- **RFQ Portal** — buyers post requests, suppliers submit quotes
- Both require **new Django models** (see [design-system/bid-rfq-spec.md](design-system/bid-rfq-spec.md))

## Hard rules

1. **Tailwind utility classes are the only styling system.** No CSS-in-JS, no
   CSS modules, no third-party UI-library components (antd, MUI, etc.) for
   layout or visuals on new Kinetic pages. Existing antd usage in legacy code
   stays until that page is migrated. For shared compositions, use `@apply` in
   `Stores-FE/styles/globals.css` / `Stores-Admin/src/tailwind.css` under
   `@layer components`.
2. **Do not touch nav / route components.** The user reserves that surface. Layout
   shells under `Layouts/` folders **are** in scope (page chrome, side panels,
   dashboard frames).
3. **Mobile-first responsive.** Every ported screen must work cleanly at 375px,
   768px, 1024px, 1440px. Use the breakpoint map in
   [design-system/responsive.md](design-system/responsive.md).
4. **Use design tokens, not raw hex.** Reference the names in
   [design-system/tokens.md](design-system/tokens.md). If a token is missing,
   add it to the tailwind config rather than hardcoding.
5. **Preserve back-compat.** Existing FE/Admin tailwind tokens stay. New Kinetic
   tokens are added alongside.
6. **Do not change fonts.** Keep Syne / DM Sans / JetBrains Mono on Stores-FE
   and Charlie on Stores-Admin. Stitch class names like `font-syne`, `font-headline`,
   `font-body` are aliased in each tailwind config to the project's existing
   fonts. Never add Plus Jakarta Sans, Epilogue, or other Stitch-only families.
7. **No new top-level dependencies** without flagging it.

## Where to start a task

| Task | Read first |
| --- | --- |
| Port a Stitch screen to React | [skills/port-stitch-page/SKILL.md](skills/port-stitch-page/SKILL.md) |
| Restyle existing component | [skills/apply-design-tokens/SKILL.md](skills/apply-design-tokens/SKILL.md) |
| Add Bid feature (FE+BE) | [skills/add-bid-feature/SKILL.md](skills/add-bid-feature/SKILL.md) |
| Add RFQ feature (FE+BE) | [skills/add-rfq-feature/SKILL.md](skills/add-rfq-feature/SKILL.md) |
| Anything visual | [design-system/](design-system/) |

## Common commands

| Action | Command (run from repo root) |
| --- | --- |
| FE dev | `cd Stores-FE && npm run dev` |
| Admin dev | `cd Stores-Admin && npm run dev` |
| BE dev | `cd Stores-BE && python manage.py runserver` |
| BE migrate | `cd Stores-BE && python manage.py makemigrations && python manage.py migrate` |
