# TradeHut Ad System

> **NOTE:** The placeholder scaffolding under `backend/` and `frontend/` in this folder is **not used**.
> The real implementation has been built into the monorepo apps. See locations below.

## Where the live code lives

| Concern | Path |
|---|---|
| Django app (models / serializers / services / admin / signals / views) | [`Stores-BE/apps/ads/`](../Stores-BE/apps/ads/) |
| Storefront client (fetch / impression / click beacons) | [`Stores-FE/lib/ads.ts`](../Stores-FE/lib/ads.ts) |
| Storefront React hook | [`Stores-FE/hooks/useAd.ts`](../Stores-FE/hooks/useAd.ts) |
| Storefront components | [`Stores-FE/components/Ads/`](../Stores-FE/components/Ads/) |
| Admin API client | [`Stores-Admin/src/services/adsAdminService.ts`](../Stores-Admin/src/services/adsAdminService.ts) |
| Admin management UI | [`Stores-Admin/src/pages/admin/AdsManagement/`](../Stores-Admin/src/pages/admin/AdsManagement/) |

## Data model

```
AdPlacement (slot definition)
    └── AdSlot ─────► Creative ────► Campaign
            └── TargetingRule (optional)
            └── AdImpression / AdClick (logs)
```

- **AdPlacement** — a named slot on the storefront (e.g. `homepage-top-bar`). One-time setup per slot.
- **Campaign** — umbrella for an advertiser's push: status (`draft|scheduled|running|paused|ended|archived`), priority, schedule, daily/total impression caps.
- **Creative** — visual asset + copy + CTA. Belongs to a Campaign. Image (desktop + mobile), video URL, or HTML.
- **AdSlot** — binds a Creative into a Placement, with weight, schedule, dismiss rules, frequency caps. The selection algorithm picks one (or N) winning slots per request.
- **TargetingRule** — optional per-slot: country / device / user-state / category / language / cart-value / path / A-B bucket.
- **AdImpression / AdClick** — analytics logs.

## Selection algorithm

`apps.ads.services.select_for_placement(slug, ctx)` runs:

1. Filter to slots where placement, slot, and campaign are all active and within their schedule windows.
2. Apply per-slot **TargetingRule** (geo, device, user state, category, language, path, cart, A/B).
3. Drop slots whose campaign has hit its daily / total impression cap.
4. Drop slots that have hit their per-session / per-day / per-week frequency cap for this user/session.
5. Weighted-random pick using `slot.weight × campaign.priority_multiplier`.
6. Return up to `placement.max_active_slots` winners, ordered by `position_hint`.

Caching: candidate pool is cached per `(placement, targeting-hash)` for 60s. Signals bust the cache on every save.

## Storefront placements (slugs)

| Slug | Where it appears |
|---|---|
| `homepage-top-bar` | Sticky strip above the navbar (replaces the legacy hardcoded PromoBar; falls back to it if no ad is live). |
| `nav-banner` | Below the hero on the homepage. Carousel-capable. |
| `homepage-modal` | Site-wide entry-intent modal with frequency cap + dismiss memory. |
| `product-page` | Above the breadcrumb on PDP. |
| `checkout-banner` | Above the checkout stepper. |
| `footer-banner` | Above the global footer. |

To add a new placement, just create it in **Admin → Ads & Promotions → Placements** and drop `<AdSlot slug="…" />` wherever you want it on the FE.

## Frontend usage

```tsx
import { AdSlot, AdTopBar, AdModal, AdCarousel, AdBanner } from '@/components/Ads'

// Generic — picks AdBanner or AdCarousel based on placement.format
<AdSlot slug="nav-banner" aspectClass="aspect-[21/4]" rounded="rounded-2xl" />

// Top promo strip (with an optional fallback if no ad is live)
<AdTopBar slug="homepage-top-bar" fallback={<LegacyPromoBar />} />

// Entry-intent modal — frequency-capped, dismiss persists in localStorage
<AdModal slug="homepage-modal" />

// Manual carousel
<AdCarousel slug="hero-carousel" aspectClass="aspect-[21/8]" />

// Manual banner (rare — usually use AdSlot)
<AdBanner slot={slot} />
```

## API endpoints

```
GET    /tradehut/api/v1/ads/placement/<slug>/        Public — serve ads
POST   /tradehut/api/v1/ads/beacon/impression/       Public — track impression
POST   /tradehut/api/v1/ads/beacon/click/            Public — track click

GET/POST/PATCH/DELETE /tradehut/api/v1/ads/admin/placements/    Staff
GET/POST/PATCH/DELETE /tradehut/api/v1/ads/admin/campaigns/     Staff
GET/POST/PATCH/DELETE /tradehut/api/v1/ads/admin/creatives/     Staff (multipart for images)
GET/POST/PATCH/DELETE /tradehut/api/v1/ads/admin/slots/         Staff
POST   /tradehut/api/v1/ads/admin/slots/<id>/toggle/             Staff — pause/resume
GET    /tradehut/api/v1/ads/admin/slots/<id>/stats/              Staff — 7d stats
GET    /tradehut/api/v1/ads/admin/campaigns/<id>/stats/          Staff — 30d stats
```

## Setup

The `apps.ads` app is already wired into `INSTALLED_APPS` and `backend/urls.py`. After pulling, run:

```bash
cd Stores-BE
python manage.py makemigrations ads
python manage.py migrate
```

Then in **Admin → Ads & Promotions**:
1. Create the 6 placements above (any extras you want).
2. Create a Campaign.
3. Add Creatives to it.
4. Book a Slot (Creative → Placement) with weight, schedule, optional targeting.
