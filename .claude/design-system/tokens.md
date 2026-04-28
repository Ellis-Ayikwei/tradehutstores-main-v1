# Kinetic Design Tokens

Source: every `code.html` in [`stitch_full_website_redesign_expansion/`](../../stitch_full_website_redesign_expansion/)
declares the same token block. This file is the canonical reference — copy
these into `tailwind.config.js` (FE) and `tailwind.config.cjs` (Admin) under
`theme.extend`. **Do not delete existing legacy tokens** — both must coexist
during migration.

## Color tokens (Material 3 derived)

```js
colors: {
  // ── Surfaces (warm neutrals) ──
  background:                 '#fff8f6',
  surface:                    '#fff8f6',
  'surface-bright':           '#fff8f6',
  'surface-dim':              '#efd5cb',
  'surface-variant':          '#f8ddd3',
  'surface-container-lowest': '#ffffff',
  'surface-container-low':    '#fff1ec',
  'surface-container':        '#ffe9e2',
  'surface-container-high':   '#fee3d9',
  'surface-container-highest':'#f8ddd3',
  'inverse-surface':          '#3d2d26',
  'inverse-on-surface':       '#ffede7',
  'surface-tint':             '#a43d00',

  // ── Primary (TradeHut Orange) ──
  primary:                    '#a43d00',
  'on-primary':               '#ffffff',
  'primary-container':        '#f5620f',
  'on-primary-container':     '#4e1900',
  'primary-fixed':            '#ffdbcd',
  'primary-fixed-dim':        '#ffb597',
  'on-primary-fixed':         '#360f00',
  'on-primary-fixed-variant': '#7d2d00',
  'inverse-primary':          '#ffb597',

  // ── Secondary (Bid green) ──
  secondary:                  '#006c4b',
  'on-secondary':             '#ffffff',
  'secondary-container':      '#60f9bd',
  'on-secondary-container':   '#00714f',
  'secondary-fixed':          '#63fcc0',
  'secondary-fixed-dim':      '#3fdfa5',
  'on-secondary-fixed':       '#002114',
  'on-secondary-fixed-variant':'#005138',

  // ── Tertiary (RFQ blue) ──
  tertiary:                   '#0058ca',
  'on-tertiary':              '#ffffff',
  'tertiary-container':       '#558dff',
  'on-tertiary-container':    '#002761',
  'tertiary-fixed':           '#d9e2ff',
  'tertiary-fixed-dim':       '#b0c6ff',
  'on-tertiary-fixed':        '#001945',
  'on-tertiary-fixed-variant':'#00429b',

  // ── Error ──
  error:                      '#ba1a1a',
  'on-error':                 '#ffffff',
  'error-container':          '#ffdad6',
  'on-error-container':       '#93000a',

  // ── Foreground ──
  'on-background':            '#261813',
  'on-surface':               '#261813',
  'on-surface-variant':       '#5a4137',
  outline:                    '#8e7165',
  'outline-variant':          '#e2bfb2',

  // ── Bid status (used in auction surfaces) ──
  bid: {
    green: '#00C48C',  // winning
    red:   '#FF4757',  // outbid / closing
    amber: '#FFB800',  // time pressure
  },
}
```

### Mapping by purpose

| Purpose | Token |
| --- | --- |
| Page background | `bg-surface` (light warm) |
| Card surface | `bg-surface-container-lowest` (white) |
| Subtle panel | `bg-surface-container-low` |
| Inset / chip | `bg-surface-container` |
| Body text | `text-on-surface` |
| Muted text | `text-on-surface-variant` |
| Hairline border | `border-outline-variant/10` (or `/15`, `/20`, `/25`) |
| CTA gradient | `bg-gradient-to-br from-primary to-primary-container` |
| Auction surfaces | `secondary` family |
| RFQ surfaces | `tertiary` family |
| Bid winning badge | `bg-bid-green/10 text-bid-green` |
| Bid outbid badge | `bg-bid-red/10 text-bid-red` |

## Typography — keep existing project fonts

**The project's existing font stacks are preserved.** Do not introduce
Plus Jakarta Sans, Epilogue, or any other family from the Stitch HTML —
the Stitch class names alias to what each app already loads.

| Token | Stores-FE resolves to | Stores-Admin resolves to |
| --- | --- | --- |
| `font-display`, `font-syne`, `font-headline`, `font-epilogue` | **Syne** (already loaded) | **Charlie** |
| `font-body`, `font-sans` | **DM Sans** (already loaded) | **Charlie** |
| `font-mono` | **JetBrains Mono** (already loaded) | **Charlie** |
| `font-nunito` (legacy) | Nunito | n/a |

The aliasing means JSX written against Stitch class names (e.g.
`className="font-syne"`) renders correctly with each app's existing
fonts — Syne+DM Sans on FE, Charlie on Admin. Visual fidelity to the
Stitch mockup is intentionally traded for font-stack stability.

The only font import the redesign adds is **Material Symbols Outlined**
for icons (already wired in both `Stores-FE/styles/globals.css` and
`Stores-Admin/src/tailwind.css`).

### Type scale used in screens

| Use | Class |
| --- | --- |
| Hero | `font-syne text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.9]` |
| Section title | `font-syne text-4xl md:text-5xl font-bold tracking-tight` |
| Card title | `font-headline font-bold text-xl` |
| Body | `text-on-surface-variant text-sm leading-relaxed` |
| Eyebrow / label | `text-[10px] font-bold uppercase tracking-widest text-on-surface-variant` |
| Price / number | `font-mono text-2xl font-bold` |

## Border radius

```js
borderRadius: {
  DEFAULT: '0.25rem',
  lg:  '0.5rem',
  xl:  '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
}
```

Usage: `rounded-xl` for inputs, `rounded-2xl` for cards, `rounded-3xl` for hero blocks and bento tiles.

## Shadows

```js
boxShadow: {
  card:        '0 4px 20px 0 rgba(38, 24, 19, 0.04), 0 1px 2px 0 rgba(38, 24, 19, 0.02)',
  'card-hover':'0 12px 32px 0 rgba(38, 24, 19, 0.08)',
}
```

Apply with `shadow-card hover:shadow-card-hover transition-all duration-300`.

## Reusable utility recipes

Add to a shared `globals.css` (FE) and `tailwind.css` (Admin):

```css
.glass-nav    { background: rgba(255,248,246,0.7); backdrop-filter: blur(24px); }
.glass-header { backdrop-filter: blur(24px); }
.primary-gradient { background: linear-gradient(135deg,#a43d00 0%,#f5620f 100%); }
.kinetic-gradient { background: linear-gradient(135deg,#a43d00 0%,#f5620f 100%); } /* alias */
.ghost-border { border: 1px solid rgba(226,191,178,0.25); }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
```

## Iconography

Use Material Symbols Outlined exclusively for the new design. In React:

```tsx
<span className="material-symbols-outlined">gavel</span>
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
  shopping_bag
</span>
```

Icon names referenced across screens: `gavel` (bid), `description` / `request_quote` (RFQ),
`shopping_bag`, `shopping_cart`, `bolt` (flash sale), `trending_up`, `verified_user`,
`schedule`, `location_on`, `dashboard`, `list_alt`, `mail`, `payments`, `settings`,
`notifications`, `account_circle`, `arrow_forward`, `add_circle`, `expand_more`,
`favorite`, `share`, `public`, `dark_mode`, `search`, `handshake`, `verified`,
`stars`, `warning`, `alarm_on`, `eco`, `inventory_2`, `credit_card`, `shield`.
