---
name: apply-design-tokens
description: Restyle an existing React component or page to use the Kinetic design tokens (colors, fonts, radii, shadows) without changing its behavior or structure. Use for legacy components that need a visual refresh but already work.
---

# Skill: apply-design-tokens

## When to use this skill

User asks to "restyle X to the new design", "apply the new tokens to Y",
or "make Z match the Stitch look" — and the component already works
functionally.

## Required reading

1. `.claude/design-system/tokens.md`
2. `.claude/design-system/components.md` (recipe reference)

## Token replacement table

| Find in current code | Replace with |
| --- | --- |
| `bg-white`, `bg-gray-50`, `bg-stone-50` | `bg-surface-container-lowest` (cards) or `bg-surface` (page) |
| `bg-gray-100`, `bg-stone-100` | `bg-surface-container-low` |
| `bg-gray-200` | `bg-surface-container` |
| `text-gray-900`, `text-stone-900`, `text-black` | `text-on-surface` |
| `text-gray-600`, `text-gray-500`, `text-stone-500` | `text-on-surface-variant` |
| `text-gray-400` | `text-outline` |
| `border-gray-200`, `border-stone-200` | `border-outline-variant/15` (or /10, /20) |
| `text-orange-600`, `text-[#F5620F]`, `text-primary-500` | `text-primary` (display) or `text-primary-container` (buttons) |
| `bg-orange-600`, `bg-primary-500` | `bg-primary-container` |
| `font-display`, `font-bold` (on hero) | `font-syne font-extrabold tracking-tighter` |
| `font-body`, `font-sans` (paragraphs) | `font-body` (now Plus Jakarta Sans) |
| numeric `font-bold` (prices) | `font-mono font-bold` |
| `rounded`, `rounded-md` | `rounded-lg` |
| `rounded-lg` (cards) | `rounded-xl` or `rounded-2xl` |
| `shadow`, `shadow-sm` (cards) | `shadow-card hover:shadow-card-hover transition-all duration-300` |
| custom hex like `#F5620F` | corresponding token from `tokens.md` |

## Auction-specific

| Find | Replace with |
| --- | --- |
| Anywhere "winning" / "you're the highest bidder" | `bg-bid-green/10 text-bid-green` chip |
| Anywhere "outbid" / "lost" | `bg-bid-red/10 text-bid-red` chip |
| Anywhere "ending soon" / time pressure | `text-bid-amber` or `text-bid-red` for <1h |

## RFQ-specific

| Find | Replace with |
| --- | --- |
| Request-related primary surface | `bg-tertiary text-on-tertiary` |
| Request-related accent | `bg-tertiary-fixed text-on-tertiary-fixed` |
| Quote button | `bg-tertiary text-white px-8 py-3 rounded-md font-bold` |

## Workflow

1. Read the target file.
2. Walk the file top to bottom; apply the table above. Preserve every
   prop, hook, and event handler.
3. If a needed token is missing from the tailwind config, add it under
   `theme.extend.colors` (FE: `tailwind.config.js`, Admin: `tailwind.config.cjs`).
4. Pass over the file a second time to add the small motion/state classes
   the new system expects:
   - All buttons get `active:scale-95 transition-transform` (or `hover:scale-105`).
   - All `<a>`/`<button>` over images get `group-hover:scale-105` siblings.
   - All "card" containers get `shadow-card hover:shadow-card-hover transition-all duration-300`.
5. Verify responsive — if the original used `sm:`/`md:` prefixes, keep them;
   if it didn't, do not add them in this skill (use port-stitch-page for that).

## What NOT to do

- Don't change the component's prop interface.
- Don't restructure JSX (that's port-stitch-page work).
- Don't remove legacy tokens from the config.
- Don't touch nav components.

## Final report

```
Restyled: <file path>
Tokens swapped: <count>
New tokens added to config: <list or "none">
Behavior changed: NO
```
