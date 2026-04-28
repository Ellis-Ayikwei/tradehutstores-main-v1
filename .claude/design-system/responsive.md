# Responsive Rules

**Mobile-first.** Write base classes for 375px; add `md:`/`lg:` for larger.

## Breakpoints

Match what's already configured in `Stores-FE/tailwind.config.js`:

| Token | Width | Typical use |
| --- | --- | --- |
| `xs` | 480px | small phones (rare) |
| `sm` | 640px | large phone / portrait tablet |
| `md` | 768px | tablet — sidebars appear |
| `lg` | 1024px | desktop — full grids |
| `xl` | 1280px | wide desktop |
| `2xl` | 1536px | container max-out |

## Test viewports

Every ported screen must be checked at:

- **375 × 812** — iPhone SE / 13 mini
- **768 × 1024** — iPad portrait
- **1024 × 768** — iPad landscape / small laptop
- **1440 × 900** — MacBook
- **1920 × 1080** — desktop

## Recurring responsive patterns

### 1. Side nav → bottom nav

```tsx
<aside className="hidden md:flex …">…</aside>
<MobileBottomNav className="md:hidden fixed bottom-0 inset-x-0 …" />
```

Add `pb-20 md:pb-0` on `<main>` so mobile content clears the bottom bar.

### 2. Grids that collapse

```
2 → 4 → 5 columns:  grid-cols-2 md:grid-cols-4 lg:grid-cols-5
1 → 2 → 3 columns:  grid-cols-1 md:grid-cols-2 lg:grid-cols-3
1 → 12-col layout:  grid-cols-1 lg:grid-cols-12  (sidebar=col-span-3, feed=col-span-9)
```

### 3. Card layouts that pivot

Stitch RFQ cards are horizontal on `md+`, stacked on mobile:

```
flex flex-col md:flex-row gap-8
```

The leading image becomes a top banner on mobile (full width) and a
fixed-width thumbnail (`md:w-48`) on desktop.

### 4. Hero typography clamps

```tsx
className="font-syne text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
```

Always pair with `tracking-tighter leading-[0.9]` for the syne hero look.

### 5. Hide secondary content

- Filter sidebars: `hidden lg:block`
- Decorative imagery: `hidden md:block`
- Search inputs: width transitions `w-48 md:w-64`
- Trust bar logos: `flex-wrap justify-center md:justify-between`

### 6. Sticky → un-sticky

Sidebars should drop their sticky positioning on mobile to avoid scroll
trapping:

```tsx
<aside className="md:sticky md:top-24 md:h-[calc(100vh-6rem)]">
```

### 7. Auction rail (horizontal scroll on mobile)

```tsx
<div className="flex gap-8 overflow-x-auto no-scrollbar pb-8 snap-x snap-mandatory">
  <div className="min-w-[320px] sm:min-w-[340px] snap-start">…</div>
</div>
```

## Hit-target rules

- Buttons must be **≥ 44px tall** on touch surfaces. Use `py-3` minimum
  (≈48px with text). Pills (`py-1.5`) are fine for tap-secondary actions
  but increase tap area with `inline-flex` padding.
- Avoid stacking two `<a>`/`<button>` elements within 8px of each other
  on mobile.

## Checklist before reporting "responsive"

- [ ] At 375px nothing horizontally overflows (no horizontal scroll bar
      except intentional rails).
- [ ] At 375px every text element is readable without zoom (≥14px).
- [ ] At 375px the dashboard sidebar is replaced by bottom nav OR a
      drawer triggered by a `menu` button.
- [ ] At 768px grids collapse from 4-col to 2-col gracefully (no orphans).
- [ ] At 1024px the sidebar reappears.
- [ ] Sticky elements don't cover the focused input on mobile.
- [ ] Tap targets are ≥44px on every interactive element.
- [ ] Images use `object-cover` and have explicit `aspect-*`.
