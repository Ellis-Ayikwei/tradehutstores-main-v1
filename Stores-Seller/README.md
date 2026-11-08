# TradeHut Seller Central (Stores-Seller)

Standalone seller dashboard for TradeHut Stores. Sellers sign in, apply for a seller account, and manage their
store here: overview, listings (with the option-types / variants wizard), orders, payouts, disputes, auctions,
RFQ and store settings.

It is a Next.js 15 (App Router) app split out of `Stores-FE`. It does not carry the buyer marketplace
(home, search, product pages, cart, checkout, account area). Those stay in `Stores-FE`.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirects to `/seller-central` |
| `/seller-central/**` | Dashboard (overview, listings, orders, payouts, disputes, auctions, rfq, settings) |
| `/sell` | Seller application and verification status |
| `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password/[uid]/[token]` | Sign in and account recovery |

## Getting started

```bash
npm install
cp .env.example .env.local   # then adjust the values
npm run dev                  # http://localhost:3001
```

Other scripts: `npm run build`, `npm run start` (port 3001), `npm run lint`.

The API (`Stores-BE`) must be running and reachable at `NEXT_PUBLIC_API_URL`.

## Environment variables

See `.env.example`. All are `NEXT_PUBLIC_*` (public, build-time).

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Stores-BE API base URL, for example `http://localhost:8000/tradehut/api/v1/` |
| `NEXT_PUBLIC_TRADEHUT_STORE_BASE_CURRENCY` | Store base currency code (default `GHS`); must match the BE |
| `NEXT_PUBLIC_IMAGE_HOST` | Public hostname for product imagery |
| `NEXT_PUBLIC_AUTH_API_URL` | Optional separate auth API host |
| `NEXT_PUBLIC_STOREFRONT_URL` | Origin of the buyer storefront (`Stores-FE`); powers the "View storefront" link and the Terms / Privacy links. Unset = those links are hidden or fall back to `/` |
| `NEXT_PUBLIC_IMAGE_TRANSFORM_BASE` | Optional Cloudflare Image Transformations origin; unset = images load straight from the CDN |

## Relationship to the other apps

- **Stores-BE** (Django + DRF) is the only backend. Seller endpoints are scoped server-side to the signed-in seller.
- **Stores-FE** is the public marketplace for buyers. Link the two with `NEXT_PUBLIC_STOREFRONT_URL` here, and point
  the storefront's "My store" / "Sell on TradeHut" links at this app's `/seller-central`.
- **Stores-Admin** is staff-only (seller review, catalog requests, platform operations).
- Auth is shared with the storefront (same API, JWT in cookies via `react-auth-kit`). Cookies are scoped to the
  host, so signing in on the storefront does not sign you in here unless both are served from the same domain.

## Deploy

Targets Cloudflare Pages through `@cloudflare/next-on-pages`, the same as `Stores-FE`:

```bash
npm run build:cf        # next build + next-on-pages
npm run deploy:pages    # wrangler pages deploy .vercel/output/static --project-name=tradehut-stores-seller
```

`wrangler.toml` names the Pages project `tradehut-stores-seller`; create that project in the Cloudflare dashboard (or
change the name) so the storefront project is never overwritten. Set the `NEXT_PUBLIC_*` variables in the Pages
dashboard. Images use the custom loader in `lib/imageLoader.ts` and never go through `/_next/image`.

## Conventions

Tailwind utilities only, mobile-first (375 / 768 / 1024 / 1440), light and dark themes with solid colours, fonts
Syne / DM Sans / JetBrains Mono, icons from `lucide-react`. See the repository `AGENTS.md` (section 5) for the full
frontend rules.
