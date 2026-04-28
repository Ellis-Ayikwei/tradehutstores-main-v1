# Kinetic Component Patterns

Reusable JSX recipes extracted from the Stitch HTML. Use these as the
**source of truth** when porting screens — copy a recipe, then swap data.

## Buttons

```tsx
// Primary CTA (gradient)
<button className="px-8 py-4 primary-gradient text-white rounded-lg font-bold text-base hover:shadow-lg active:scale-95 transition-all">
  Explore
</button>

// Secondary glass (over imagery)
<button className="px-8 py-4 bg-surface/10 backdrop-blur-md text-white border border-surface/30 rounded-lg font-bold hover:bg-surface/20 active:scale-95 transition-all">
  Place a Bid
</button>

// Tertiary outline
<button className="bg-white text-secondary outline outline-1 outline-secondary px-8 py-3 rounded-md font-bold hover:bg-secondary/5 active:scale-95 transition-all">
  View Specs
</button>

// Compact / pill
<button className="px-3 py-1 bg-secondary text-white text-[10px] font-bold rounded-full">
  24 BIDS
</button>
```

## Card variants

### Product card (rail)

```tsx
<article className="group bg-surface-container-lowest rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all duration-300 relative overflow-hidden">
  <div className="aspect-square rounded-lg overflow-hidden bg-surface-container-low mb-4 relative">
    <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
    <span className="absolute top-2 left-2 px-2 py-1 bg-error text-white text-[10px] font-bold rounded">-45%</span>
  </div>
  <h3 className="font-bold text-sm truncate mb-1">Title</h3>
  <div className="flex items-center gap-2 mb-3">
    <span className="font-mono text-lg font-bold text-primary">$499.00</span>
    <span className="font-mono text-xs text-outline line-through">$899.00</span>
  </div>
</article>
```

### Auction card (dark surface)

```tsx
<div className="min-w-[340px] bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
  <div className="flex justify-between items-start mb-6">
    <div className="flex -space-x-2">{/* bidder avatars */}</div>
    <div className="px-3 py-1 bg-secondary text-white text-[10px] font-bold rounded-full">24 BIDS</div>
  </div>
  <img className="w-full aspect-video object-cover rounded-xl mb-6" />
  <h3 className="text-xl font-bold mb-2">Item</h3>
  <div className="flex justify-between items-end">
    <div>
      <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Current Bid</span>
      <div className="font-mono text-2xl font-bold text-secondary-fixed-dim">$1,420.00</div>
    </div>
    <button className="bg-secondary text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105">
      Quick Bid
    </button>
  </div>
</div>
```

### RFQ card (light surface)

```tsx
<article className="bg-surface-container-lowest p-8 rounded-2xl shadow-card ghost-border flex flex-col md:flex-row gap-8 group">
  <div className="md:w-48 h-48 bg-surface-container-low rounded-xl overflow-hidden flex-shrink-0">
    <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
  </div>
  <div className="flex-grow flex flex-col justify-between">
    <div>
      <h2 className="font-syne font-bold text-2xl group-hover:text-tertiary transition-colors">
        Title
      </h2>
      <div className="font-mono text-xl font-bold text-tertiary">$12,500 - $18,000</div>
      <p className="text-on-surface-variant text-sm line-clamp-2">Description…</p>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex gap-3">
        <Pill icon="schedule">5 days left</Pill>
        <Pill icon="description">4 Bids</Pill>
        <Pill icon="location_on">Berlin, DE</Pill>
      </div>
      <button className="bg-tertiary text-white px-8 py-3 rounded-md font-bold shadow-lg active:scale-95">
        Submit Quote
      </button>
    </div>
  </div>
</article>
```

### Bid status card (winning / outbid)

```tsx
// Winning
<div className="bg-surface-container-lowest rounded-2xl shadow-card p-6 relative">
  <span className="absolute top-4 right-4 bg-bid-green/10 text-bid-green px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
    Winning
  </span>
  {/* ... */}
</div>

// Outbid (left rail accent)
<div className="bg-surface-container-lowest rounded-2xl shadow-card p-6 border-l-4 border-bid-red">
  <span className="bg-bid-red/10 text-bid-red px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
    Outbid
  </span>
  {/* ... */}
</div>
```

## Pill / chip

```tsx
function Pill({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full">
      {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
      {children}
    </span>
  );
}
```

## Form controls

```tsx
// Search input
<div className="relative flex items-center bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant/15">
  <span className="material-symbols-outlined text-outline">search</span>
  <input
    className="bg-transparent border-none focus:ring-0 text-sm font-body ml-2 w-48 md:w-64 placeholder:text-outline"
    placeholder="Search marketplace..."
  />
</div>

// Checkbox list (RFQ filter)
<label className="flex items-center gap-3 cursor-pointer group">
  <input type="checkbox" className="rounded border-outline-variant text-tertiary focus:ring-tertiary" />
  <span className="text-sm group-hover:text-tertiary transition-colors">Precision Tooling</span>
</label>
```

## Section header

```tsx
<div className="flex items-end justify-between mb-10">
  <div className="space-y-2">
    <div className="flex items-center gap-3">
      <span className="px-2 py-0.5 bg-error-container text-error text-[10px] font-bold rounded-sm uppercase tracking-tighter">
        Live Now
      </span>
      <h2 className="font-syne text-4xl font-bold tracking-tight">Flash Velocity.</h2>
    </div>
    <p className="text-on-surface-variant text-sm">Rapid fire deals.</p>
  </div>
  {/* right slot: countdown, sort dropdown, etc */}
</div>
```

## Countdown (mono digits)

```tsx
<div className="flex gap-2 font-mono">
  {[['04','Hrs'],['32','Min'],['15','Sec']].map(([n,l],i) => (
    <React.Fragment key={l}>
      {i>0 && <span className="text-2xl font-bold">:</span>}
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-primary">{n}</span>
        <span className="text-[10px] uppercase text-outline">{l}</span>
      </div>
    </React.Fragment>
  ))}
</div>
```

## Bento / mode-discovery tile

3-column grid, `aspect-[4/5]`, image at 10% opacity behind content, icon
chip (`w-14 h-14 rounded-2xl`), title in `font-syne text-3xl font-bold`,
"arrow_forward" chevron in colored CTA link. See `tradehut_homepage_1` for
canonical example (Buy / Bid / Request triple).

## Newsletter / accent block

`bg-primary-container rounded-[3rem] p-12 md:p-24` with a blurred radial
glow (`absolute w-64 h-64 bg-primary rounded-full blur-[100px]`) in a
corner. Used for hero CTAs and newsletter signups.

## Anti-patterns

- Don't use `text-gray-XXX` or `text-stone-XXX` for new code. Use
  `text-on-surface` / `text-on-surface-variant`.
- Don't hardcode hex. Add a token if missing.
- Don't use raw `<button>` without `active:scale-95 transition-transform`
  or `hover:scale-105` motion — every button has motion.
- Don't omit `.material-symbols-outlined` font-variation-settings on
  filled icons; use `style={{ fontVariationSettings: "'FILL' 1" }}`.
