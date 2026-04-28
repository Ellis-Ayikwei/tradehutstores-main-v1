# Layout Primitives

Two recurring layout shells across the redesign.

## 1. Marketplace shell (Stores-FE public pages)

```
┌──────────────────────────────────────────────┐
│ Announcement bar (full bleed, on-surface bg) │  ← optional
├──────────────────────────────────────────────┤
│ Glass nav (sticky, max-w-screen-2xl)         │  ← DO NOT REPLACE
├──────────────────────────────────────────────┤
│ Secondary tag rail (overflow-x-auto)         │  ← optional
├──────────────────────────────────────────────┤
│ <main> sections, each:                       │
│   max-w-screen-2xl mx-auto px-8 py-{12..24}  │
├──────────────────────────────────────────────┤
│ Footer (rounded-t-3xl bg-stone-50)           │
└──────────────────────────────────────────────┘
```

Skeleton:

```tsx
<div className="min-h-screen bg-surface text-on-surface">
  <AnnouncementBar />          {/* optional, see homepage_1 */}
  <TopNav />                   {/* existing — do not modify */}
  <main>
    {/* Each section: */}
    <section className="py-16 bg-surface">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
        {/* … */}
      </div>
    </section>
  </main>
  <Footer />
</div>
```

## 2. Account / dashboard shell (Stores-Admin + FE account pages)

Two flavors: collapsible sidenav (seller dashboard) or fixed sidenav with
sticky main header (account central).

```
┌─ aside w-64/w-72 ──┬──────────────────────────────┐
│ Logo + identity    │ glass-header (sticky top-0)  │
│ ───────────────    ├──────────────────────────────┤
│ nav links          │ <section> page content       │
│ ───────────────    │   p-6 md:p-8                 │
│ CTA (Add Listing)  │   space-y-8                  │
│ ───────────────    │                              │
│ Settings / Help    │                              │
└────────────────────┴──────────────────────────────┘
```

Skeleton (mobile drawer + desktop sticky):

```tsx
<div className="flex min-h-screen">
  <aside className="hidden md:flex h-screen w-64 sticky left-0 top-0 flex-col py-8 px-4 bg-surface">
    <SidebarBrand />
    <nav className="space-y-1 flex-1">{/* … */}</nav>
    <button className="kinetic-gradient text-white rounded-xl py-3 px-4 font-bold">
      Add Listing
    </button>
  </aside>

  <main className="flex-1 min-w-0 pb-20 md:pb-12">
    <header className="sticky top-0 z-40 glass-header h-16 px-6 flex justify-between items-center shadow-sm">
      {/* … */}
    </header>
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* sections */}
    </div>
  </main>

  <MobileBottomNav className="fixed bottom-0 inset-x-0 md:hidden" />
</div>
```

Active link state:

```tsx
// Active
className="flex items-center gap-3 px-4 py-3 text-primary-container font-bold border-r-4 border-primary-container bg-surface-container-low"
// Inactive
className="flex items-center gap-3 px-4 py-3 text-on-surface opacity-70 hover:opacity-100 hover:bg-surface-container-low transition-colors"
```

## Container widths

| Surface | Max width |
| --- | --- |
| Marketplace pages (FE public) | `max-w-screen-2xl` (1536px) |
| Dashboard inner content | `max-w-7xl` (1280px) |
| Article / single column reading | `max-w-3xl` (768px) |
| Modal | `max-w-lg` to `max-w-2xl` |

## Padding ladder

| Breakpoint | Section py | Page px |
| --- | --- | --- |
| sm (mobile) | `py-12` | `px-4` |
| md (tablet) | `py-16` | `px-6` or `px-8` |
| lg+ | `py-20` to `py-24` | `px-8` |

## Sticky / fixed elements

- **Top nav**: `sticky top-0 z-50 glass-nav`
- **Dashboard header**: `sticky top-0 z-40 glass-header`
- **Sidebar**: `sticky left-0 top-0 h-screen` (desktop only)
- **Mobile bottom nav**: `fixed bottom-0 inset-x-0 z-40 md:hidden`
- **Modal overlay**: `fixed inset-0 z-modal` (z-100)
- **Toast**: `z-toast` (z-110)

## Footer

Reuse the Stitch footer pattern: `rounded-t-3xl bg-stone-50` (light) or
`bg-stone-900` (dark), 4-column grid on `md+`, inner `max-w-screen-2xl`,
copyright + locale row separated by `border-t border-stone-200`.

## What is OUT of scope

- The **TopNav** component (Stores-FE Navigation folder, Stores-Admin nav).
- Routing / route wiring.

What **is** in scope: layout shells, page chrome, side panels, dashboard
frames, and every screen body.
