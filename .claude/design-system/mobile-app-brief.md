# TradeHut Mobile — "Signal" Design Brief

The design language for the **TradeHut marketplace mobile app**. This is a
**mobile-only** system — it deliberately does **not** use the web "Kinetic"
tokens. The web apps (Stores-FE / Stores-Admin) keep Kinetic per
[CLAUDE.md](../CLAUDE.md); the phone app gets its own modern, e-commerce-first
language called **Signal**.

Everything here is written so you can generate the screens **with Claude**
(claude.ai artifacts). Copy the master prompt in [§10](#10-the-master-prompt),
drop in a screen from the [§11 library](#11-per-screen-prompt-library).

> **Target framing.** Prompts produce **high-fidelity self-contained HTML
> mockups in a 390 × 844 phone frame** — the format Claude designs best. Tokens
> map 1:1 to **React Native / Expo** (see [§9](#9-handing-off-to-code)). Want
> Flutter or a PWA instead? Swap only the "Output format" line of the master
> prompt.

---

## 1. The product in one paragraph (paste as context)

> TradeHut is an **e-commerce marketplace** where people buy and sell industrial
> and consumer goods. Shopping is the primary job; there are also two power
> features — **Auctions** (live timed bidding) and **Requests / RFQ** (post what
> you need, suppliers send quotes). Audience: everyday buyers, SMB procurement,
> and independent sellers. The app must feel like a **premium modern shopping
> app** — fast, photo-forward, trustworthy at checkout — with auctions and
> requests as first-class but secondary entry points, not a re-theme of the
> whole app. Tone: **clean, confident, quietly premium.**

---

## 2. Design direction — "Signal"

A product-first commerce aesthetic: let the **photography and the price** carry
each screen, keep the chrome quiet, and spend all the color on **one electric
accent** plus honest semantic states.

**Principles**
1. **Product photography is the hero.** Big, edge-to-edge, generous. UI recedes.
2. **Black is the primary action.** CTAs (`Add to bag`, `Buy now`, `Checkout`)
   are near-black — high-contrast, premium, unmistakable. The electric accent is
   for *interaction* (active tab, links, selected chips, focus), never the whole
   button set.
3. **One accent, not three.** Unlike the old three-color mode theming, Signal
   uses a single accent everywhere. Shopping / Auctions / Requests are told apart
   by **iconography, labels, and layout** — not by recoloring the app.
4. **Prices are typographic, not "techy."** Regular prices use the UI sans with
   `tabular-nums` + semibold. Monospace is reserved for **live data** — auction
   countdowns and bid ticks — where a "terminal" feel is earned.
5. **Depth is subtle.** Cards sit on a faint cool-porcelain canvas with hairlines
   and whisper-soft shadows. No heavy drop shadows, no glows (except the dark
   auction sub-mode).
6. **Auctions go dark.** The live-bid flow flips to a near-black immersive theme
   so the item photo and the current bid own the screen. Everything else is light.

---

## 3. Color scheme

Cool-biased **porcelain** neutrals (chosen, not a default grey), near-black ink,
and a single **electric indigo** accent. Semantic colors are separate from the
accent and only signal state.

### 3.1 Light — default app

| Role | Hex | Use |
| --- | --- | --- |
| Background | `#F4F5F7` | App canvas (cool porcelain) |
| Surface / card | `#FFFFFF` | Cards, sheets, rows |
| Surface-2 | `#EEF0F3` | Inputs at rest, chips, skeletons |
| **Ink** | `#131316` | Primary text **and primary buttons** |
| Ink-2 | `#5B5F66` | Secondary text |
| Ink-3 | `#9AA0A8` | Placeholder, disabled, tertiary |
| Hairline | `#E6E8EC` | Dividers, card borders |
| **Accent (electric indigo)** | `#4B3BFF` | Active tab, links, selected chip, focus ring, price emphasis on promo |
| Accent ink | `#FFFFFF` | Text/icon on accent |
| Accent soft | `#ECEBFF` | Accent tint fills, selected chip bg |

> The exact accent is tunable — `#4B3BFF` reads modern + trustworthy. If you want
> more retail energy, shift toward `#2D5BFF` (electric blue); keep it a single
> saturated hue.

### 3.2 Semantic (state only — never used as the accent)

| State | Hex | Meaning |
| --- | --- | --- |
| Success | `#0FA968` | In stock, order placed, "you're winning" |
| Sale / urgent | `#E5484D` | Discount %, low stock, "outbid" |
| Live / time pressure | `#F5A524` | Auction live, ending soon, countdown |
| On-semantic | `#FFFFFF` | Text on solid semantic fills |

Use as tinted badges: fill at ~12% opacity, text at full (e.g. `-45%` = `#E5484D`
on `#E5484D1F`).

### 3.3 Dark "Auction" sub-mode (live bidding only)

| Role | Hex | Use |
| --- | --- | --- |
| Auction bg | `#0E0F12` | Near-black neutral canvas |
| Auction surface | `#17191D` | Raised panels |
| Panel overlay | `#FFFFFF` @ 6% | Cards on dark |
| Hairline | `#FFFFFF` @ 8% | Dividers |
| Text | `#FFFFFF` | Primary |
| Muted | `#FFFFFF` @ 60% | Labels, meta |
| Current-bid numeral | `#FFFFFF` | Big number stays white/clean |
| Bid CTA | `#4B3BFF` | "Place Bid" = accent (pops on dark) |
| Winning ▲ | `#0FA968` · Timer | `#F5A524` |

---

## 4. Typography

Modern grotesk pairing. **Do not** use Inter/Space Grotesk as the "safe" pick.

| Family | Role | Fallback stack |
| --- | --- | --- |
| **Clash Display** | Display / headlines / big price | `'Clash Display', 'Hanken Grotesk', system-ui, sans-serif` |
| **General Sans** | Body / UI / labels / prices | `'General Sans', system-ui, -apple-system, 'Segoe UI', sans-serif` |
| **Geist Mono** | Live data only — countdowns, bid ticks | `'Geist Mono', ui-monospace, 'JetBrains Mono', Consolas, monospace` |

**Price rule:** normal prices render in **General Sans, 600, `tabular-nums`** —
*not* mono. Mono is only for auction timers and live bid tickers.

### Mobile type ramp

| Token | Size / line | Weight / tracking | Family |
| --- | --- | --- | --- |
| Display | 32 / 34 | 600, `-0.02em` | Clash Display |
| H1 (screen title) | 24 / 28 | 600 | Clash Display |
| H2 (section) | 19 / 24 | 600 | Clash Display |
| Card title | 15 / 20 | 600 | General Sans |
| Body | 15 / 22 | 400 | General Sans |
| Caption / meta | 13 / 18 | 500 | General Sans |
| Label / eyebrow | 11 / 14 | 600, `uppercase`, `+0.08em` | General Sans |
| Price (big) | 22 / 24 | 700, `tabular-nums` | General Sans |
| Price (inline) | 15 | 600, `tabular-nums` | General Sans |
| Live timer / bid tick | 15–28 | 600, `tabular-nums` | Geist Mono |

Minimum body size on phone: **14px**.

---

## 5. Spacing, radius, elevation

- **Grid:** 4-pt base. Screen gutter **16px**; section gap **28px**; card padding
  **12–14px**.
- **Radius (tight-modern):** buttons/inputs `12`, product images `14`, cards `16`,
  bottom sheets `28` (top corners), chips/pills `full`.
- **Elevation (subtle, cool):** cards mostly rely on white-on-porcelain + a
  hairline. Reserve shadow for floating things:
  - Card (optional): `0 1px 2px rgba(19,19,22,.04)`
  - Sheet / sticky bar: `0 -6px 24px rgba(19,19,22,.06)` (top) / `0 12px 32px rgba(19,19,22,.10)`
- **Safe areas:** clear the tab bar with `pb-24`; respect notch + home indicator.
- **Hit targets:** ≥ 44 × 44px. Primary buttons `py-4` (~52px).

---

## 6. Iconography

Modern **line icons** — **Lucide** (or Phosphor), 1.75px stroke, rounded caps.
Filled variant only for the active tab and the wishlist heart. Core set:

`home` · `search` · `plus` (sell) · `heart` · `user` · `shopping-bag` /
`shopping-cart` · `bell` · `sliders-horizontal` (filter) · `arrow-up-down` (sort) ·
`gavel` (auction) · `file-text` (request) · `star` (rating) · `badge-check`
(verified) · `truck` (shipping) · `shield-check` (buyer protection) ·
`chevron-right` · `map-pin` · `clock` · `credit-card` · `package`.

---

## 7. Navigation model

Shopping-first **bottom tab bar, 5 slots**, with a raised center **Sell** action.
Cart is a top-right badge (not a tab).

```
[ Home ]   [ Search ]   [  ⊕ Sell  ]   [ Saved ]   [ Account ]
  home       search       (raised FAB)   heart       user
```

- **Active tab** = accent indigo, filled icon + label. Bar has a hairline top,
  frosted white background.
- **Cart** = top-right bag icon + count badge on Home / Search / Product.
- **Auctions** and **Requests** are reached from **Home** — a prominent "Live
  auctions" rail and an "Open requests" card — and from an "Explore" chip row.
  They are first-class, but they don't own a tab (keeps the bar shopping-clean).
- **Sell FAB** opens a sheet: *Sell an item · Start an auction · Post a request.*
- Detail screens push over the tabs with a back chevron + **sticky bottom CTA bar**.

---

## 8. Component kit (mobile specs)

- **App bar** — 56px; brand/back left; center search on Home; right = wishlist +
  cart (with count). Large Clash title appears on scroll-top.
- **Search bar** — full-width `rounded-xl`, `#EEF0F3` fill, `search` leading icon,
  `sliders-horizontal` trailing → opens filter **bottom sheet**.
- **Category row** — horizontally scrolling round thumbnails or pill chips.
- **Hero / promo carousel** — full-bleed `rounded-2xl` banners, page dots.
- **Deal rail** — horizontal cards with `-%` sale pill + mono countdown.
- **Product card** — white `rounded-2xl`, square photo (`14` radius), wishlist
  heart top-right, sale pill top-left, brand/seller micro-row with `badge-check`,
  title (2-line clamp), **price (tabular sans) + struck compare**, star rating.
  2-up grid.
- **Product detail (PDP)** — swipeable gallery + dots; title + price block +
  rating; variant chips (size/color) with selected = accent ring; quantity
  stepper; trust strip (`truck` free shipping, `shield-check` protection,
  `package` returns); seller card; reviews summary; related rail; **sticky bottom
  bar: `Add to bag` (outline) + `Buy now` (black)**.
- **Sticky bottom CTA bar** — price left, full-height black primary right, safe-area padded.
- **Cart / bag** — line items with qty stepper + swipe-to-remove, promo field,
  summary, sticky `Checkout`.
- **Checkout** — express pay row (Apple/Google Pay style), address card, shipping
  options (radio cards), payment method, order total (tabular), `Place order`.
- **Filter / sort sheet** — `rounded-t-3xl`, drag handle; price range, category,
  brand, rating, condition; `Apply` (black).
- **Auction card (dark)** — `white/6` panel on near-black, bidder avatars + "N
  bids", 16:9 photo, **"Current bid" + big white number**, mono countdown chip
  (amber, red under 1 min), accent `Place Bid`.
- **Bid status row** ("My bids") — thumbnail, your bid vs current, **Winning**
  (green) / **Outbid** (red, left accent) badge, mono countdown.
- **RFQ card (light)** — category eyebrow, title, budget range (tabular), meta
  pills (`clock` days left · `file-text` N quotes · `map-pin`), accent
  `Submit quote`.
- **Rating** — `star` row + numeric (tabular) + review count.
- **Chips** — filter (selectable → accent-soft fill + accent text), status pills.
- **Empty states** — line icon in a `#EEF0F3` circle, Clash title, muted line, one
  black action.
- **Toast / banner** — top, `rounded-2xl`, semantic left accent.
- **Skeletons** — `#EEF0F3` shimmer blocks matching card shapes; never spinners on content.

---

## 9. Motion & feel (what makes it "smooth")

- Buttons press to `scale .97`, spring back. Tap targets ≥44px.
- `Add to bag` → item flies to the cart icon; badge count bumps + haptic.
- Wishlist heart fills with a subtle pop.
- Screen push: slide-in 250ms ease-out; sheets slide-up 300ms; backdrop dim
  `#131316` @ 45%.
- Pull-to-refresh on feeds; skeletons on first load.
- Auctions: bid tick count-up + light/success/heavy haptics for bid/win/outbid;
  last 10s pulse the timer.
- Honor `prefers-reduced-motion`: drop count-ups/parallax, keep opacity fades.

---

## 10. The master prompt

```text
You are designing a screen for the TradeHut mobile app — a premium e-commerce
marketplace (buy & sell industrial + consumer goods, plus live Auctions and
Requests/RFQ). Shopping is the primary job; the app must feel fast, photo-forward,
and trustworthy at checkout. Tone: clean, confident, quietly premium.

DESIGN SYSTEM ("Signal"):
- Product photography is the hero; UI chrome is quiet. Spend color on ONE accent.
- Primary buttons (Add to bag, Buy now, Checkout, Apply) are near-black #131316.
  The accent electric-indigo #4B3BFF is only for interaction: active tab, links,
  selected chips, focus rings, promo price emphasis — never the whole button set.
- One accent, not three: Shopping / Auctions / Requests differ by icon + label +
  layout, not by recoloring the app.
- Colors: bg #F4F5F7 (cool porcelain), cards #FFFFFF, insets/chips #EEF0F3,
  ink #131316, muted #5B5F66, hairline #E6E8EC. Semantic: success #0FA968,
  sale/urgent #E5484D, live/countdown #F5A524.
- Auctions ONLY flip to a dark immersive theme: bg #0E0F12, panels white@6%, big
  white current-bid number, amber mono countdown, accent "Place Bid".
- Type: Clash Display (600, headlines + big price), General Sans (body/UI/labels),
  Geist Mono ONLY for live timers + bid ticks. Prices use General Sans 600 with
  tabular-nums — NOT mono.
- Radius: buttons/inputs 12, images 14, cards 16, sheets 28, pills full.
- Subtle depth: hairlines + whisper shadows, no glows (except dark auction).
- Lucide line icons (1.75px). Bottom tab bar: Home · Search · [+Sell FAB] ·
  Saved · Account; cart is a top-right badge; sticky bottom CTA on detail screens.
- Buttons press-scale .97; tap targets ≥44px; mobile-first, thumb-reachable.

OUTPUT FORMAT: One self-contained responsive HTML file (inline CSS, icons as
inline SVG) rendered inside a 390×844 phone frame with a subtle bezel, status bar,
and home indicator. Realistic placeholder content (real product names, brands,
prices, ratings, timers) — no lorem ipsum. Include active/selected states. Comment
the major sections.

SCREEN TO DESIGN: ⟨screen name⟩
KEY ELEMENTS: ⟨components + states this screen needs⟩
STATE/VARIANT: ⟨default / loading / empty / winning / outbid / etc⟩
```

---

## 11. Per-screen prompt library

Append each block to the master prompt. Build in this order (core commerce first):

**1. Onboarding + Sign-in** — brand splash, 3 value props (Shop / Auctions /
Requests), email + Apple/Google sign-in, "continue as guest".

**2. Home (shop)** — app bar w/ search + wishlist + cart badge; category chip row;
promo hero carousel; "Deals" rail w/ sale pills + countdown; 2-up product grid;
a "Live auctions" rail (dark cards) + an "Open requests" card entry. Default state.

**3. Search + filter sheet** — search field w/ recent + suggestions; results as
2-up grid w/ result count + sort; filter bottom sheet (price range, category,
brand, rating, condition, Apply).

**4. Product detail (PDP)** — swipe gallery + dots; title + price + rating; variant
chips; qty stepper; trust strip; seller card; reviews summary; related rail;
sticky bar (Add to bag + Buy now). Include wishlist heart + a sale pill.

**5. Cart / bag** — line items w/ qty steppers + swipe-to-remove; promo code;
order summary; sticky Checkout. Include an empty-bag state variant.

**6. Checkout** — express pay row; address card; shipping option radio cards;
payment method; order total (tabular); Place order. Show the review state.

**7. Order confirmed + Orders + tracking** — success screen; orders list w/ status
pills; order detail w/ tracking timeline (`truck`), items, totals, "Buy again".

**8. Wishlist / Saved** — saved product grid, move-to-bag, empty state.

**9. Auction hub (DARK)** — dark theme; "Live" header; hero auction card (big white
bid, avatars, amber countdown); grid of auction cards; "ending soon" rail.

**10. Bid detail + Quick-bid sheet (DARK)** — full-bleed photo; current bid + N
bids + mono countdown; bid history; sticky "Place Bid" → sheet w/ +/- stepper,
preset increments, confirm. Show the winning success state.

**11. My bids** — tabs Active / Won / Lost; bid status rows w/ Winning (green) /
Outbid (red) badges; empty state.

**12. Requests / RFQ board + Post a request** — RFQ cards (budget range, days left,
N quotes, location); FAB "Post a request"; the post form (item, category, qty,
budget range, deadline, description, photos) w/ sticky submit.

**13. My requests + quotes** — my RFQs w/ quote counts; a request detail listing
supplier quotes (price tabular, verified, lead time) w/ Accept.

**14. Account** — profile header w/ verification + rating; grid (Orders, Bids,
Requests, Wishlist, Messages, Payment, Addresses, Settings); sign-out.

**15. Sell hub** — FAB action sheet (Sell item / Start auction / Post request); a
create-listing step (photos, title, category, price/starting bid, condition,
shipping) w/ progress + sticky next.

---

## 12. Consistency checklist (before accepting a screen)

- [ ] Primary CTA is near-black `#131316`; indigo `#4B3BFF` used only for
      interaction/selection — not as a button color.
- [ ] Regular prices are tabular sans (600), not mono; mono only on live timers.
- [ ] Product photo is the hero; chrome is quiet; cool-porcelain canvas.
- [ ] Bottom tab bar (Home·Search·+·Saved·Account) on tabs; sticky CTA on detail.
- [ ] Auction screens (and only those) use the dark sub-mode.
- [ ] Radius 12 buttons / 14 images / 16 cards / 28 sheets; subtle cool shadows.
- [ ] Tap targets ≥44px; content clears the tab bar (`pb-24`) + safe areas.
- [ ] Real placeholder copy + at least one non-default state.
- [ ] Lucide line icons; Clash headers, General Sans body, tabular prices.

---

## 9. Handing off to code

```ts
// theme.ts — TradeHut mobile "Signal"
export const color = {
  bg:'#F4F5F7', surface:'#FFFFFF', surface2:'#EEF0F3',
  ink:'#131316', ink2:'#5B5F66', ink3:'#9AA0A8', hairline:'#E6E8EC',
  accent:'#4B3BFF', accentInk:'#FFFFFF', accentSoft:'#ECEBFF',
  success:'#0FA968', sale:'#E5484D', live:'#F5A524',
  aucBg:'#0E0F12', aucSurface:'#17191D',
};
export const radius = { md:12, img:14, lg:16, sheet:28, full:9999 };
export const space  = { gutter:16, section:28, card:14 };
```

**Expo:** load Clash Display + General Sans + Geist Mono via `expo-font` /
`@fontsource`; icons via `lucide-react-native`; `NativeWind` to share Tailwind
class names. Prices: a `<Price>` component that always applies `tabular-nums`.

_Companion visual style-tile lives as a Claude Artifact — regenerate from the
prompts above._
