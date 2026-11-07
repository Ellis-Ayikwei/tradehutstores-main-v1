# Admin UI system (shadcn/ui + Tailwind v3)

All new or rewritten admin/seller pages use shadcn/ui. Legacy pages keep antd / Chakra / Mantine / Headless UI until migrated.

## Where things live

| What | Path |
| --- | --- |
| shadcn components | `src/components/shadcn/` (alias `@/components/shadcn`) |
| `cn()` helper | `src/lib/utils.ts` (`@/lib/utils`) |
| Theme tokens (CSS variables) | `src/tailwind.css` (`:root` and `.dark`), mapped in `tailwind.config.cjs` |
| CLI config | `components.json` (`aliases.ui = @/components/shadcn`) |
| Legacy components (do not edit) | `src/components/ui/*` |

`src/components/ui/` already has `Button.tsx`, `Card.tsx`, `Tabs.tsx`; Windows is case-insensitive, so shadcn must never be installed there. Import shadcn as `import { Button } from '@/components/shadcn/button'`.

## Theme

- Tokens: `background foreground card popover primary muted accent destructive border input ring` (+ `-foreground`).
- `primary` is the TradeHut orange `#dc711a`. The old `primary-50..900` scale is unchanged. Do not use alpha variants as backgrounds (see Solid surfaces below).
- Dark mode follows `html.dark` (toggled by `store/themeConfigSlice`); the `.dark` variable block handles it.
- The legacy `secondary` colour is charcoal (`#4a4a4a`), so shadcn "secondary" surfaces use `muted` (see `Button` variant `secondary`, `Badge` variant `secondary`). Do not use `bg-secondary` in shadcn components.
- Status colours come from the existing `success / warning / info` scales; `Badge` has `success | warning | info | destructive` variants.
- Font stays Charlie. Icons: `lucide-react`.

### Preset `bbVJxYW` (base-maia, neutral)

The look follows shadcn preset `bbVJxYW` (style `base-maia`, base colour `neutral`, subtle menu accent), **hand-ported** to Tailwind v3 + Radix. Do **not** run `shadcn init --preset bbVJxYW` here: it rewrites the project to Tailwind v4, `@base-ui/react`, `tw-animate-css` and the Inter font. `components.json` stays on `style: default` so `shadcn add` keeps producing v3/Radix code; restyle anything added to match:

- Radius: `--radius: 0.625rem`. Controls (button, input, select, badge, tabs) are pills: `rounded-4xl`. Cards/menus `rounded-2xl`, menu items and textareas `rounded-xl`, dialogs `rounded-4xl` (`rounded-3xl` on mobile).
- Sizes: buttons/inputs/selects `h-9` (`sm` `h-8`, `lg` `h-10`, extra `xs`, `icon-xs|sm|lg`). Weight `font-medium`.
- Fields are filled: `border-input bg-muted`. Focus: `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary-subtle`. Invalid: `aria-[invalid=true]:border-destructive … ring-destructive-subtle`.
- Overlays: `bg-popover border border-border shadow-2xl`; tooltips are inverted (`bg-foreground text-background`).
- Neutral greys from the preset; `accent` is neutral (menu hover). Brand tint chips use `primary-subtle`. `destructive` buttons/badges are subtle, solid red on hover.
- Charts: `chart-1..5` tokens (`chart-1` = brand orange).
- Maia's translucent recipes (`bg-input/30`, `bg-destructive/10`, `ring-foreground/10`, backdrop blur) are replaced with the solid equivalents above, per the rule below.

## Solid surfaces (no translucent / glass backgrounds)

Icon chips, avatars, badges, buttons, cards, chips and nav items use **solid** colours. Never `bg-primary/10`, `bg-white/20`, `bg-black/5`, `bg-opacity-*`, `bg-transparent` chips, `backdrop-blur`, or `border-white/10`-style borders (AGENTS.md section 1b).

| Instead of | Use |
| --- | --- |
| `bg-primary/10 text-primary` | `bg-primary-subtle text-primary-subtle-foreground` |
| `bg-success/15`, `bg-warning/15`, `bg-info/15` | `bg-success-subtle text-success-subtle-foreground` (same for `warning`, `info`) |
| `bg-destructive/10 text-destructive` | `bg-destructive-subtle text-destructive-subtle-foreground` |
| `hover:bg-primary/90` | `hover:bg-primary-hover` (`hover:bg-destructive-hover` for destructive) |
| `bg-muted/50`, `hover:bg-muted/50` | `bg-muted`, `hover:bg-muted` |
| `bg-background/80 backdrop-blur` (sticky headers, bottom nav) | `bg-background` |

The `*-subtle` tokens are CSS variables in `src/tailwind.css` (light and dark) mapped in `tailwind.config.cjs`, so they stay solid and keep contrast in both themes.

Allowed exceptions only: the dim scrim behind dialogs/sheets (`bg-black/60`) and dark gradient overlays on photos that are required for text legibility.

## Adding a component

1. Use the shadcn **v3-compatible (Tailwind v3, Radix) source**, not the v4 / Base UI variant. The CLI can be used with `components.json`, but check the output: no `@theme`, no `data-slot`/`size-*` assumptions that break v3, and `tailwind-merge` must stay on v2.
2. Save to `src/components/shadcn/<kebab-name>.tsx`; import helpers via `@/lib/utils` and siblings via `@/components/shadcn/...`.
3. Replace `bg-secondary` with `bg-muted`; keep the Label `mb-0` override (legacy global `label` rule adds margin).
4. New npm deps must be flagged in the PR/report first.

## Migration rule

A page is migrated when it imports none of antd / Chakra / Mantine / Headless UI / FontAwesome / Emotion and none of the legacy Kinetic classes below. When you migrate a page, replace the legacy classes with shadcn tokens; when the last user of a legacy token is gone, delete it from `tailwind.config.cjs` / `src/tailwind.css`.

### Legacy (ex-Kinetic) tokens still in use

Warm-surface/bid colours in `tailwind.config.cjs`: `surface`, `surface-container-{lowest,low,"",high,highest}`, `on-surface`, `on-surface-variant`, `on-background`, `outline`, `outline-variant`, `on-primary`, `primary-container`, `primary-fixed`, `k-secondary`, `on-secondary`, `secondary-container`, `on-secondary-container`, `secondary-fixed`, `secondary-fixed-dim`, `on-secondary-fixed`, `tertiary`, `tertiary-fixed`, `error`, `error-container`, `on-error-container`, `bid-{green,red,amber}`. Also `shadow-card`, `shadow-card-hover`, and the font aliases `font-syne`, `font-headline` (`font-mono` is used widely too).

CSS in `src/tailwind.css`: `.glass-header`, `.primary-gradient`, `.no-scrollbar`, `.material-symbols-outlined` plus the Google Material Symbols `@import`.

Users: `components/Layouts/{Header,Sidebar}.tsx`, `components/Layouts/Header/CurrencySwitcher.tsx`, `pages/admin/{EcommerceDashboard,CreateListing,SellerProfile,MerchandisingHomepage}.tsx`, `pages/admin/OrderManagement/`, `pages/admin/configurations/**`, `pages/admin/AdsManagement/**`, `pages/admin/PromosManagement/**`, `pages/admin/Search/`.

## Patterns

### List page (server-side table)

```tsx
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(25);
const [sort, setSort] = useState<DataTableSort | null>({ id: 'created_at', desc: true });
const [search, setSearch] = useState('');

// SWR / axios: ?page=&page_size=&ordering=(-)field&search=
const { data, error, isLoading, mutate } = useSWR(['/orders', page, pageSize, sort, search], fetchOrders);

<PageHeader title="Orders" description="Orders to fulfil" actions={<Button>Export</Button>} />
<DataTable
  columns={columns}            // ColumnDef<Order>[]; set meta.label for mobile cards, enableSorting:false where the API cannot sort
  data={data?.results ?? []}
  total={data?.count ?? 0}
  page={page} pageSize={pageSize}
  onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
  sort={sort} onSortChange={(s) => { setSort(s); setPage(1); }}
  search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}
  isLoading={isLoading} error={error} onRetry={() => mutate()}
  toolbar={/* status Select etc. */}
/>
```

`DataTable` shows a table from `md` up and cards below; the default card uses each column's `meta.label` (or string header). Columns with no label (row actions) render in the card footer. Pass `renderMobileCard` for a custom layout. It never loads the full collection; reset `page` to 1 whenever filter/sort/search change.

### Page shell

`PageHeader` (title, description, actions) then content. KPI rows use `StatCard` in `grid gap-3 grid-cols-2 lg:grid-cols-4`. Use `EmptyState` for empty lists and `Skeleton` for loading. Forms: `Form` + `FormField` (react-hook-form + `zod` via `@hookform/resolvers/zod`), single column on mobile, with a sticky action bar (`sticky bottom-0 border-t bg-background p-3`).

### Toasts

Mount `<Toaster />` from `@/components/shadcn/sonner` once (it is not mounted yet; add it to the layout/App) and call `toast.success(...)` from `sonner`/the same module.
