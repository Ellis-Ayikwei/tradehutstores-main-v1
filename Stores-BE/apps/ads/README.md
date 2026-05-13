# Ads — How it runs (a guided tour)

This guide explains the TradeHut ad system from the ground up. By the end you
should know **what each piece does, how a request becomes a served ad, what
each setting actually changes, and how to ship your first ad in under five
minutes.**

> If you only need an inventory of files, jump to
> [Where the code lives](#where-the-code-lives) at the bottom.

---

## Table of contents

1. [Mental model in 90 seconds](#mental-model-in-90-seconds)
2. [Glossary](#glossary)
3. [TL;DR — install and seed](#tldr--install-and-seed)
4. [Tutorial — your first ad in 5 minutes](#tutorial--your-first-ad-in-5-minutes)
5. [The data model](#the-data-model)
6. [Request lifecycle — what happens when a page loads](#request-lifecycle--what-happens-when-a-page-loads)
7. [The selection algorithm in plain words](#the-selection-algorithm-in-plain-words)
8. [Caching](#caching)
9. [Targeting recipes](#targeting-recipes)
10. [Frequency caps explained](#frequency-caps-explained)
11. [Storefront integration](#storefront-integration)
12. [The Admin UI tour](#the-admin-ui-tour)
13. [API reference](#api-reference)
14. [Operations](#operations)
15. [Troubleshooting](#troubleshooting)
16. [Where the code lives](#where-the-code-lives)

---

## Mental model in 90 seconds

The system has **four nouns**:

```
Placement     →  a hole in the page where an ad goes (e.g. "homepage-top-bar")
Campaign      →  the umbrella for an advertiser push (status, budget, schedule)
Creative      →  the actual visual + copy + CTA (the thing the user sees)
Slot          →  the booking that says "show this Creative in that Placement"
```

A **Slot** is the only thing the runtime cares about. Everything else exists to
organize Slots and make them easier to manage.

When a page loads, the FE asks the BE *"give me the Slot that should win for
placement X right now, given this visitor."* The BE filters all Slots to those
that are eligible (active, scheduled, targeted at this visitor, not over their
frequency cap), then picks one weighted-randomly. The winning Slot's Creative
is rendered.

That's the whole system in one paragraph.

---

## Glossary

| Term | Meaning |
|---|---|
| **Placement** | A named spot on the storefront where ads can appear, identified by a slug like `homepage-top-bar`. The FE calls `<AdSlot slug="…" />` to render whichever ad wins. |
| **Slug** | The short, URL-safe ID for a Placement (`homepage-top-bar`, `nav-banner`). Stable forever — the FE codes against it. |
| **Format** | What kind of placement: `banner` / `carousel` / `modal` / `topbar` / `sidebar` / `inline_card` / `fullscreen`. Determines which FE component renders it. |
| **Campaign** | An umbrella around one or more Creatives. Carries status (`draft`/`scheduled`/`running`/`paused`/`ended`), priority, schedule, and impression caps. The advertiser-facing concept. |
| **Status** | A Campaign's lifecycle state. Only `running` (or `scheduled` within its window) actually serves ads. |
| **Priority** | A Campaign-level multiplier (Low / Normal / High / Urgent). Higher priority slots win the auction more often. |
| **Creative** | The visual + copy + CTA. Image (desktop + mobile), video, or HTML. Reusable across Placements via separate Slots. |
| **Slot** | A booking that binds one Creative to one Placement, with weight, schedule, dismiss rules, frequency caps, and optional targeting. The unit of selection. |
| **Weight** | A Slot's selection probability vs. other slots competing for the same placement. Three slots with weights 20/10/10 win ≈50%/25%/25%. |
| **Targeting Rule** | Optional per-Slot constraints (geo, device, user state, language, category, cart value, path, A/B bucket). If absent, the Slot is shown to everyone. |
| **Frequency cap** | "Don't show this Slot more than N times per session/day/week to the same person." Avoids ad fatigue. |
| **Impression** | One row recorded each time the FE renders a Slot to a visitor. |
| **Click** | One row recorded when the user clicks the Creative's CTA. |
| **CTR** | Click-through rate = clicks / impressions × 100%. |
| **Beacon** | A small fire-and-forget POST sent via `navigator.sendBeacon`. Used for impressions and clicks so they survive page navigation. |
| **Dismiss memory** | Client-side localStorage flag set when a user closes a dismissible ad. Prevents re-render for ~7 days. |

---

## TL;DR — install and seed

```bash
cd Stores-BE
venv/Scripts/python.exe manage.py migrate ads
venv/Scripts/python.exe manage.py seed_ads        # creates 6 placements + 8 demo ads
```

Then start servers:

```bash
# Terminal 1
cd Stores-BE && venv/Scripts/python.exe manage.py runserver

# Terminal 2
cd Stores-FE && npm run dev
```

Open http://localhost:3000 — top bar, hero carousel, modal (after 8s), PDP banner, checkout banner, footer banner are all live.

Manage them in **Stores-Admin → Products → Ads & Promotions** (`/admin/ads`).

---

## Tutorial — your first ad in 5 minutes

Let's run a "20% off this weekend" banner on the homepage.

### 1. Make sure the Placement exists

The seeder created `nav-banner` (the homepage-hero placement) for you. If
you skipped the seeder:

> Open **Admin → Ads → Placements → New placement**
> - Name: `Homepage Hero Banner`
> - Slug: `nav-banner` (the FE already references this slug — keep it identical)
> - Format: `Carousel`
> - Aspect ratio: `21/4`
> - Max active slots: `3` (so up to 3 ads rotate)
> - Rotation seconds: `6`

### 2. Create a Campaign

> **Admin → Ads → Campaigns → New campaign**
> - Name: `Weekend 20% off`
> - Advertiser: `TradeHut House`
> - Status: `Running` (so it serves immediately)
> - Priority: `Normal`
> - Starts at: leave blank ("now")
> - Ends at: pick Sunday midnight
> - Save

### 3. Make a Creative

> **Admin → Ads → Creatives → New creative**
>
> A side-by-side editor opens. Fill in the **left** column; the **right**
> column updates the live preview as you type:
>
> - Campaign: pick `Weekend 20% off`
> - Internal name: `Weekend 20% off – orange variant`
> - Eyebrow: `THIS WEEKEND`
> - Headline: `Save 20% on everything`
> - Sub-headline: `No code needed. Auto-applies at checkout.`
> - CTA label: `Shop the sale`
> - CTA URL: `/deals`
> - Background: pick the **TradeHut orange** swatch (or any preset)
> - Text color: white
> - Accent: yellow
>
> Drop in a desktop image too if you have one (1600×400 looks good). Save.

### 4. Book the Slot

> **Admin → Ads → Slots & Targeting → Book a slot**
> - Placement: `Homepage Hero Banner · nav-banner`
> - Creative: pick the one you just made
> - Weight: `20` (high — wins more often than the existing seeded ads)
> - Active: ✓
> - Starts at / ends at: leave blank for "always while campaign is live"
> - (Optional) Targeting: leave off to show everyone, or click "Enable
>   targeting" and pick countries/devices/etc.
> - Save

### 5. See it live

Reload http://localhost:3000. Your ad shows in the homepage hero carousel,
weighted ~50% vs. the other seeded ads. Click it — `AdClick` fires. Watch the
**Stats** column on the Slots tab tick up.

Total time: about 5 minutes the first time, ~90 seconds after that.

---

## The data model

```
AdPlacement (created once by ops)
    │   slug · name · format · aspect_ratio · max_active_slots · rotation_seconds · is_active
    │
    ├───► AdSlot (the runtime booking)
            │   placement_id · creative_id · is_active · weight · position_hint
            │   starts_at · ends_at · dismissible · delay_seconds · cap_per_*
            │
            ├──► TargetingRule (optional, one per Slot)
            │      countries · devices · user_states · categories · languages
            │      path_includes · path_excludes · ab_bucket · cart range
            │
            └──► Creative
                    │   campaign_id · format · image_desktop · image_mobile · video_url · html_body
                    │   eyebrow · headline · subheadline · cta_label · cta_url · open_in_new_tab
                    │   background_color · text_color · accent_color · alt_text
                    │
                    └──► Campaign (the umbrella)
                            id · name · advertiser · seller? · status · priority
                            starts_at · ends_at · daily_impression_cap · total_impression_cap
```

Plus two log tables:

- **AdImpression** — written every time an ad is served. Used for CTR + frequency-cap counting.
- **AdClick** — written every time a CTA is clicked.

Why split it like this?

- **Placement** is forever. The FE codes against the slug. You almost never delete one.
- **Campaign** lets ops group related ads under one schedule and one budget cap.
- **Creative** is the asset — designers care about this. One creative can be reused in many Placements.
- **Slot** is the booking — it's where the operational levers live (weight, schedule, frequency cap, targeting). The selection algorithm only ever picks Slots.
- **TargetingRule** is optional and one-to-one with a Slot, so you don't pay for it on simple "show to everyone" slots.

Models live in [models.py](models.py).

---

## Request lifecycle — what happens when a page loads

Concrete trace of what happens when a user opens the homepage:

```
1. Browser requests / (the homepage HTML)
2. Next.js renders <AdSlot slug="nav-banner" />
3. The hook useAd("nav-banner") fires from the browser:

      GET /tradehut/api/v1/ads/placement/nav-banner/?path=/&ab=

   with the X-Forwarded-* headers (CF-IPCOUNTRY, etc.) and an
   `ad_session` cookie that the FE auto-creates on first visit.

4. The BE view `serve_placement` runs `build_context_from_request(request)`:

      TargetingContext(
          country='GH',                 # from CF-IPCOUNTRY
          device='desktop',             # parsed from User-Agent
          user_state='anon',            # not logged in
          session_id='s_abc…',          # from cookie
          user_id=None,
          path='/',
          language='en',
          ab_bucket='',
      )

5. select_for_placement('nav-banner', ctx) runs the 5-step algorithm
   (see next section) and returns up to 3 Slots (because
   placement.max_active_slots == 3).

6. Each winning Slot is serialized into the public payload:

      {
        "slug": "nav-banner",
        "format": "carousel",
        "max_active_slots": 3,
        "rotation_seconds": 6,
        "slots": [
          { "id": "uuid-1", "creative": {...} },
          { "id": "uuid-2", "creative": {...} },
          { "id": "uuid-3", "creative": {...} }
        ]
      }

7. The FE renders the carousel.

8. For each slot rendered, the hook fires a beacon impression once:

      POST /tradehut/api/v1/ads/beacon/impression/  { slot: "uuid-1" }

   (sendBeacon — survives page navigation, doesn't block UI.)

9. If the user clicks one of the CTAs, the AdBanner component fires:

      POST /tradehut/api/v1/ads/beacon/click/
      { slot: "uuid-1", destination_url: "/deals" }

   …then the browser navigates.
```

The hot path (steps 4-7) typically completes in under 5ms once the
candidate-pool cache is warm.

---

## The selection algorithm in plain words

Inside `services.select_for_placement`. Five filters, in order, then a weighted
random pick:

### Filter 1 — Schedule + active flags

Drop slots where:
- the Placement is `is_active = false`
- the Slot is `is_active = false` or `weight <= 0`
- now < `slot.starts_at` or now > `slot.ends_at`
- the Slot's Campaign isn't in `running` or `scheduled` status
- now < `campaign.starts_at` or now > `campaign.ends_at`

One indexed SQL query. Fast.

### Filter 2 — Targeting

For each remaining slot, evaluate its `TargetingRule` (if it has one) against
the request `TargetingContext`. If the slot has **no** rule, it passes — the
default is "everyone." See [Targeting recipes](#targeting-recipes) for what
each field does.

### Filter 3 — Campaign-level impression caps

If a Campaign sets `daily_impression_cap` or `total_impression_cap`, count its
served impressions today / total. If it's at or above the cap, drop every Slot
under that Campaign for the rest of the day (or forever, for total).

### Filter 4 — Per-user frequency caps

For each surviving Slot, count *this visitor's* impressions of *this slot*:
- If `cap_per_session > 0`, count impressions matching this `session_id`.
- If `cap_per_day > 0`, count impressions today (per user OR session).
- If `cap_per_week > 0`, count impressions in the last 7 days.

If any cap is hit, drop the slot.

### Filter 5 — Weighted-random pick

From whoever survived, pick up to `placement.max_active_slots` winners.
Probability of a slot being picked is proportional to:

```
slot.weight × campaign_priority_multiplier
```

where the priority multiplier is:

| Campaign priority | Multiplier |
|---|---|
| Urgent (20) | ×100 |
| High (10) | ×5 |
| Normal (5) | ×2 |
| Low (1) | ×1 |

Concrete example: three slots competing in the same placement.

| Slot | Weight | Campaign priority | Effective weight | Probability |
|---|---|---|---|---|
| A | 10 | Normal (×2) | 20 | 20 / 70 ≈ 29% |
| B | 20 | Normal (×2) | 40 | 40 / 70 ≈ 57% |
| C | 10 | Low (×1) | 10 | 10 / 70 ≈ 14% |

Bumping B's Campaign to **Urgent** would change its multiplier to ×100,
giving it weight 2000 vs 30 — winning ≈98% of the time. That's why "Urgent"
should be reserved for genuinely urgent things (incident notifications, etc.).

Winners are returned ordered by `position_hint` (low first), then by descending
weight as a tiebreaker.

### Why weighted-random instead of "always the best"?

A deterministic ranking would over-serve one ad and starve the rest. Weighted
random gives:
- **Predictable share-of-voice** — a slot with weight 20 vs weight 10 serves
  ~2× as often, but both still serve.
- **Natural rotation** in carousels — feels more organic to users.
- **One simple knob** that ops can move without engineering involvement.

The full implementation is in [services.py](services.py).

---

## Caching

Two layers, both indexed by placement slug:

### 1. Placement metadata cache

| Key | TTL | Contents |
|---|---|---|
| `ads:placement:<slug>` | 5 minutes | The `AdPlacement` row itself (immutable per request). |

Busted by `signals.on_placement_change` whenever anyone saves a Placement.

### 2. Candidate-pool cache

After filters 1 & 2 (schedule + targeting), the surviving slots are cached:

| Key | TTL | Contents |
|---|---|---|
| `ads:candidates:<slug>:<targeting-hash>` | 60 seconds | List of slot objects that *would* serve, before frequency caps. |

The targeting hash is a SHA-1 of `(country, device, user_state, path,
language, ab_bucket, sorted category_ids)` truncated to 16 chars. Two visitors
with the same targeting context share the same cache key.

Frequency-cap filtering happens **after** the cache lookup (step 4 of the
algorithm), so per-user caps still work correctly even when many users hit
the same cached pool.

### Why these specific TTLs?

- **5 min** for placement metadata: balances "ops just edited the placement
  and reloads to check" with not hammering the DB on every request.
- **60 s** for candidate pool: short enough that newly created or paused slots
  appear/disappear quickly, long enough to amortize cost during traffic spikes.
  Signals also bust this cache when a Slot/Campaign/TargetingRule is saved.

### Manual cache control

```python
from apps.ads.services import bust_placement_cache, bust_all_caches
bust_placement_cache("homepage-top-bar")
bust_all_caches()
```

Signals in [signals.py](signals.py) trigger these automatically:

| Saved | What gets busted |
|---|---|
| Placement | Just that placement |
| Slot | Just that slot's placement |
| TargetingRule | Just that targeting's slot's placement |
| Creative | All placements where the creative has a slot |
| Campaign | All placements (campaign edits can affect many) |

---

## Targeting recipes

Common things ops want to do, and how to express them.

### "Show only to mobile users in Ghana"

> Targeting → enable
> - Countries: `GH`
> - Devices: ✓ Mobile (uncheck Desktop and Tablet)

### "Show only to logged-in buyers"

> Targeting → enable
> - User states: ✓ Logged in only · ✓ Buyers only

### "Show on every page except checkout"

> Targeting → enable
> - Path excludes: `/checkout,/cart`

### "Show only on electronics-related pages"

> Targeting → enable
> - Path includes: `/electronics,/products/phones-tablets,/categories/electronics`

You can also pass `?cat=<uuid>` from the FE if you want category-targeted
ads. The FE doesn't currently send this; if you wire it, also enable
**Categories** in the targeting rule.

### "Welcome offer for first-time visitors"

> Targeting → enable
> - User states: ✓ Anonymous only · ✓ New users (<30d)
>
> Then on the Slot itself:
> - cap_per_session: `1`
> - cap_per_week: `1`
> - dismissible: ✓
> - show_close_after_seconds: `2`

So they see it once per browser session, max once per week even if they clear
their dismiss cookie.

### "Geo-pricing offer for one country only"

> Targeting → enable
> - Countries: `KE` (Kenya only)
> - Languages: `en,sw` (English + Swahili)

### "A/B test two creative variants"

Make two slots in the same placement, equal weight. Each with its own creative.
On the FE, decide a bucket per visitor and pass it as `?ab=A` or `?ab=B`.
Then targeting → A/B bucket = `A` on slot 1, `B` on slot 2.

### "Promote checkout abandonment recovery"

> Targeting → enable
> - Devices: any
> - Min cart value: `200`
> - Max cart value: (blank)
>
> Pair with a Creative that links to `/cart`.

> ⚠️ Cart-value targeting requires the FE to pass `cart_value` in the
> request — that's not yet wired in `useAd`. Add `?cart=123.45` and update
> `build_context_from_request` to read it.

---

## Frequency caps explained

Set per-Slot. `0` = unlimited.

| Field | What it counts |
|---|---|
| `cap_per_session` | Impressions matching this `session_id` (the `th_ad_session` cookie value, lifetime of the browser-local session). |
| `cap_per_day` | Impressions for this user OR session, since 00:00 server time today. |
| `cap_per_week` | Impressions for this user OR session, in the last 7 days. |

Logged-in users count under their `user_id`; anonymous users count under their
`session_id`. If both apply (logged-in user with a session cookie), the cap is
hit when **either** count crosses the limit.

### Dismiss memory (FE-side, separate from caps)

When a user clicks the close button on a dismissible ad, the FE writes:

```
localStorage[`th_ad_dismiss:${slot.id}`] = Date.now() + 7 days
```

`useAd` filters out dismissed slots client-side before rendering. The 7-day
TTL means a manual close lasts a week, even if the slot has no per-week cap.

To clear:

```js
localStorage.removeItem('th_ad_dismiss:<slot-id>')
```

---

## Storefront integration

```tsx
import { AdSlot, AdTopBar, AdModal, AdCarousel, AdBanner } from '@/components/Ads'
import { useAd } from '@/hooks/useAd'

// Generic dispatcher — picks the right component based on placement.format
<AdSlot slug="nav-banner" aspectClass="aspect-[21/4]" rounded="rounded-2xl" />

// Sticky top promo strip with a fallback (legacy hardcoded message)
<AdTopBar slug="homepage-top-bar" fallback={<LegacyPromoBar />} />

// Entry-intent modal — frequency-capped, dismiss persists
<AdModal slug="homepage-modal" />

// Direct carousel (skip the dispatcher)
<AdCarousel slug="hero-carousel" aspectClass="aspect-[21/8]" />

// Headless: full control of rendering
const { placement, loading } = useAd('product-page', { path: '/products/xyz' })
```

### What you get for free

| Behavior | Source |
|---|---|
| Auto-create + remember session id | `lib/ads.ts → getOrCreateSessionId` |
| Send impression beacon once per visible slot, per mount | `useAd` |
| Send click beacon on CTA click | every Ad component |
| Dismiss button + 7-day local memory | `lib/ads.ts → markDismissed` |
| Mobile vs desktop image switch | `AdBanner` (uses `hidden md:block` / `md:hidden`) |
| Carousel auto-rotation | `AdCarousel` (uses `placement.rotation_seconds`) |
| Modal entry-intent delay + frequency cap | `AdModal` |
| Use `sendBeacon` so events survive page navigation | `lib/ads.ts → postBeacon` |

### Where the seeded ads show

| Storefront | Slot slug |
|---|---|
| Sticky strip above navbar (every page) | `homepage-top-bar` |
| Carousel below the homepage hero | `nav-banner` |
| Centered popup, dimmed backdrop (after 8s, 1/session) | `homepage-modal` |
| Above the breadcrumb on PDP | `product-page` |
| Above the checkout stepper | `checkout-banner` |
| Above the global footer | `footer-banner` |

---

## The Admin UI tour

`/admin/ads` is built around four tabs (`AdsManagement/index.tsx`):

### Dashboard hero

The top of the page shows live system health at a glance:

| Card | What it tells you |
|---|---|
| Live ads | Slots that pass the live check right now (active + scheduled + campaign running). |
| Running campaigns | Campaigns with status = `running`, plus the total non-archived count. |
| Impressions · 30d | Sum across all campaigns. |
| Click-through · 30d | Total clicks ÷ total impressions for the same window. |

A "Top performers" row underneath shows the 3 campaigns with the most
impressions in the last 30 days.

### Campaigns tab

Card grid filtered by status. Each card shows:

- Status badge (animated pulse when running)
- Priority pill (urgent/high get a colored stripe across the top)
- Schedule (e.g. "Nov 20 → Dec 1", or "Always on")
- Caps (if set)
- 30-day stats: creatives, impressions, CTR (color-coded — green ≥1.5%, amber otherwise)
- Quick action button: pause / run

Click a card to edit. The status picker is a row of color-coded buttons so
"running" looks visibly different from "draft."

### Creatives tab

Card grid where each card *renders the actual creative as it'll appear on
the storefront*. Hover for edit / duplicate / delete.

The editor is **side-by-side**: form on the left, live preview on the right.
The preview updates as you type. A small toggle at the top of the preview
lets you switch between **banner / topbar / modal** so you can see how the
copy reads in different placement formats.

Image upload is a drag-drop zone (separate slots for desktop and mobile).
Color pickers are swatch grids — pick from preset brand colors or paste a
custom hex / gradient.

### Placements tab

Card grid keyed by format. Each card shows:

- Format icon (rectangle for banner, navbar for topbar, etc.)
- Active-slot count
- Aspect ratio & rotation chips
- Click the slug to copy `<AdSlot slug="…" />` to your clipboard

Most teams set up Placements once and never touch them again.

### Slots & Targeting tab

The day-to-day operational workspace. Each row shows:

- Live thumbnail of the creative (left)
- Status pill (LIVE / READY / OFF)
- Weight, schedule, caps, and targeting summarized as colored chips
- 7-day stats footer
- Quick actions: pause, edit, delete

The editor uses a **weight slider** for quick tuning, a **device chip
selector** that's faster than checkboxes, and a contextual sidebar that shows
the chosen creative's preview plus the snippet you'd paste in code:
`<AdSlot slug="my-slug" />`.

A help bubble in the sidebar explains how the weight you just set translates
into share-of-voice vs. other slots.

---

## API reference

### Public — anonymous, called from the storefront

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/tradehut/api/v1/ads/placement/<slug>/?path=&ab=&cat=` | Resolve ads for a placement |
| `POST` | `/tradehut/api/v1/ads/beacon/impression/` | Record a served impression |
| `POST` | `/tradehut/api/v1/ads/beacon/click/` | Record a CTA click |

Public response shape (see [serializers.py](serializers.py)):

```json
{
  "slug": "nav-banner",
  "name": "Homepage Hero Banner",
  "format": "carousel",
  "aspect_ratio": "21/4",
  "max_active_slots": 3,
  "rotation_seconds": 6,
  "slots": [
    {
      "id": "uuid",
      "creative": {
        "id": "uuid",
        "format": "image",
        "image_desktop": "https://.../desktop.jpg",
        "image_mobile": "https://.../mobile.jpg",
        "headline": "...",
        "cta_label": "...",
        "cta_url": "...",
        "background_color": "...",
        "text_color": "...",
        "accent_color": "..."
      },
      "position_hint": 0,
      "dismissible": true,
      "delay_seconds": 0
    }
  ]
}
```

Slot internals like weight, schedule windows, frequency caps, and targeting
are **not** exposed to the storefront — only what the FE needs to render.

### Staff — Authorization: Bearer + is_staff

| Method | Path | Purpose |
|---|---|---|
| `GET / POST / PATCH / DELETE` | `/tradehut/api/v1/ads/admin/placements/` | Placement CRUD |
| `GET / POST / PATCH / DELETE` | `/tradehut/api/v1/ads/admin/campaigns/` | Campaign CRUD |
| `GET` | `/tradehut/api/v1/ads/admin/campaigns/<id>/stats/?days=30` | 30d performance for one campaign |
| `GET / POST / PATCH / DELETE` | `/tradehut/api/v1/ads/admin/creatives/` | Creative CRUD (multipart for image upload) |
| `GET / POST / PATCH / DELETE` | `/tradehut/api/v1/ads/admin/slots/` | Slot CRUD |
| `POST` | `/tradehut/api/v1/ads/admin/slots/<id>/toggle/` | Pause / resume one slot |
| `GET` | `/tradehut/api/v1/ads/admin/slots/<id>/stats/?days=7` | 7d performance for one slot |

All admin viewsets are in [admin_views.py](admin_views.py); permission gate in
[permissions.py](permissions.py).

---

## Operations

### Seed demo data

```bash
venv/Scripts/python.exe manage.py seed_ads          # idempotent
venv/Scripts/python.exe manage.py seed_ads --reset  # wipe demo campaign + re-create
```

Source: [management/commands/seed_ads.py](management/commands/seed_ads.py).

Creates: 6 placements, 1 running campaign ("TradeHut House - Demo"), 8
image-less creatives (styled with gradients and brand colors so the
storefront looks alive without any uploaded assets), and 8 slots wired to
all six storefront placements.

### SQL for dashboards

```sql
-- How many ads are live for each placement right now?
SELECT p.slug, COUNT(s.*) AS live_slots
FROM ads_adplacement p
LEFT JOIN ads_adslot s ON s.placement_id = p.id AND s.is_active = TRUE
GROUP BY p.slug
ORDER BY live_slots DESC;

-- 24-hour impression / click counts per campaign
SELECT
  c.name,
  COUNT(DISTINCT i.id)    AS impressions,
  COUNT(DISTINCT cl.id)   AS clicks
FROM ads_campaign c
LEFT JOIN ads_adimpression i  ON i.campaign_id = c.id AND i.served_at  > NOW() - INTERVAL '1 day'
LEFT JOIN ads_adclick      cl ON cl.campaign_id = c.id AND cl.clicked_at > NOW() - INTERVAL '1 day'
GROUP BY c.name
ORDER BY impressions DESC;

-- Top slots by CTR over the last 7 days
SELECT
  s.id,
  cr.name                                   AS creative_name,
  pl.slug                                   AS placement,
  COUNT(DISTINCT i.id)                      AS impressions,
  COUNT(DISTINCT cl.id)                     AS clicks,
  ROUND(100.0 * COUNT(DISTINCT cl.id) / NULLIF(COUNT(DISTINCT i.id), 0), 2) AS ctr_pct
FROM ads_adslot s
JOIN ads_creative cr      ON cr.id = s.creative_id
JOIN ads_adplacement pl   ON pl.id = s.placement_id
LEFT JOIN ads_adimpression i ON i.slot_id = s.id AND i.served_at  > NOW() - INTERVAL '7 days'
LEFT JOIN ads_adclick      cl ON cl.slot_id = s.id AND cl.clicked_at > NOW() - INTERVAL '7 days'
GROUP BY s.id, cr.name, pl.slug
HAVING COUNT(DISTINCT i.id) > 100   -- ignore noise
ORDER BY ctr_pct DESC
LIMIT 20;
```

### Tables that grow fast

`ads_adimpression` writes one row per served ad, per visitor, per render.
On a busy storefront this can be millions of rows per day. Plan for one of:

- **Postgres declarative partitioning** by `served_at` (weekly partitions).
  Drop old partitions after 90 days.
- A **scheduled job** that rolls raw rows into `(slot_id, day, count)`
  aggregates and prunes raw rows older than N days.
- Ship raw rows to a **warehouse** (BigQuery, Snowflake, ClickHouse) and
  truncate the OLTP table weekly.

### Adding a new storefront placement

1. **Admin → Placements → New placement.** Pick slug, format, aspect ratio.
2. Drop `<AdSlot slug="my-new-slot" />` wherever you want it on the FE.
3. **Admin → Slots → Book a slot.** Bind a Creative. Set weight + targeting.
4. Done — selection runs immediately; cache TTL ≤ 5 min.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `<AdSlot>` renders nothing | No slot is currently live. In Admin → Slots, every row should show a green LIVE badge. If they all say READY, the campaign isn't running. If OFF, the slot is paused. |
| New creative not appearing for 60s | Targeting candidate-pool cache TTL. Edit the slot or campaign and signals will bust it instantly. |
| Modal never shows up | Frequency cap hit (e.g. `cap_per_session=1`), or it was dismissed. In DevTools console: `localStorage.removeItem('th_ad_dismiss:<slot-id>')` then refresh. |
| Click not tracked | Browser blocked `sendBeacon` or CORS rejected the request. Check Network tab — the POST to `/ads/beacon/click/` should appear. |
| `relation "ads_campaign" does not exist` | You haven't run `python manage.py migrate ads` yet. |
| Admin returns 403 | Your Django user needs `is_staff = True` (or `is_superuser`). |
| FE fetches but nothing renders | Check the response — `slots: []` means selection returned nothing. Check the slot's targeting (you might be excluded by country/device) and impression caps. |
| `value too long for type character varying(20)` saving a creative | You're using a CSS gradient string. Make sure migration `0002_alter_creative_background_color` ran (`python manage.py migrate ads`). |
| TypeError from impression / click serializer | The slot UUID is wrong or the slot was deleted between page render and beacon fire. Safe to ignore. |

---

## Where the code lives

| Concern | File |
|---|---|
| Models (Placement, Campaign, Creative, Slot, TargetingRule, Impression, Click) | [models.py](models.py) |
| Selection algorithm + targeting matcher + cache + tracking writers | [services.py](services.py) |
| Public read serializers | [serializers.py](serializers.py) |
| Staff CRUD serializers | [admin_serializers.py](admin_serializers.py) |
| Public endpoints (placement, beacons) | [views.py](views.py) |
| Staff CRUD viewsets | [admin_views.py](admin_views.py) |
| URL conf | [urls.py](urls.py) |
| Permission gate (`is_staff`) | [permissions.py](permissions.py) |
| Cache-busting signals | [signals.py](signals.py) |
| Django admin (backup CRUD UI) | [admin.py](admin.py) |
| Demo seeder | [management/commands/seed_ads.py](management/commands/seed_ads.py) |
| **Storefront client** (fetch, beacons, dismiss memory, session id) | [Stores-FE/lib/ads.ts](../../../Stores-FE/lib/ads.ts) |
| **Storefront hook** | [Stores-FE/hooks/useAd.ts](../../../Stores-FE/hooks/useAd.ts) |
| **Storefront components** (AdSlot/Banner/Carousel/TopBar/Modal) | [Stores-FE/components/Ads/](../../../Stores-FE/components/Ads/) |
| **Admin client** (typed CRUD wrapper) | [Stores-Admin/src/services/adsAdminService.ts](../../../Stores-Admin/src/services/adsAdminService.ts) |
| **Admin UI** (dashboard + 4 tabs + shared building blocks) | [Stores-Admin/src/pages/admin/AdsManagement/](../../../Stores-Admin/src/pages/admin/AdsManagement/) |
