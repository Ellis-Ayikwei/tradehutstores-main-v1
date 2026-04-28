---
name: port-stitch-page
description: Port a single Stitch HTML mockup into a working React page in Stores-FE or Stores-Admin using Tailwind utility classes only, applying Kinetic design tokens and mobile-first responsive rules. Use when the user says "port the X page" or "convert the homepage_2 design".
---

# Skill: port-stitch-page

## When to use this skill

User asks to convert one screen from
`stitch_full_website_redesign_expansion/<folder>/code.html` into a real
React page.

## Styling system: Tailwind utility classes ONLY

This whole project styles with **Tailwind**. Every Kinetic page is built
the same way the Stitch HTML is built — utility classes on JSX elements.

**Do:**

- Express every style as a Tailwind class (or a token already declared in
  `tailwind.config.js` / `tailwind.config.cjs`).
- For repeated complex compositions, use `@apply` inside the project's
  global stylesheet (`Stores-FE/styles/globals.css` or
  `Stores-Admin/src/tailwind.css`) — under `@layer components` — and use
  the resulting class name in JSX.
- Add new design tokens to the tailwind config when the existing tokens
  don't cover what the Stitch HTML expresses.

**Don't:**

- Don't introduce CSS-in-JS (styled-components, emotion, vanilla-extract).
- Don't add CSS modules (`Foo.module.css`).
- Don't add inline `style={{ … }}` for anything Tailwind can express
  (the only acceptable inline styles are dynamic computed values like
  `style={{ width: \`${pct}%\` }}` for progress bars, or
  `style={{ fontVariationSettings: "'FILL' 1" }}` for filled Material
  Symbols icons).
- Don't import design from `antd` / `@headlessui/react` / `@tabler/icons`
  for new pages — even though they exist in `package.json`, the new
  Kinetic look is hand-built with Tailwind + Material Symbols. Use
  Headless UI **only** for behavior primitives (modals, popovers) and
  style them yourself with Tailwind.
- Don't write raw `<style>` tags or untokenized hex.

## Required reading order

1. `.claude/CLAUDE.md`
2. `.claude/design-system/tokens.md`
3. `.claude/design-system/components.md`
4. `.claude/design-system/layouts.md`
5. `.claude/design-system/responsive.md`
6. `.claude/design-system/screens-map.md`  ← find the target route
7. The Stitch HTML to be ported
8. The existing target page (if any) — preserve its data hooks

## Steps

### 1. Locate target

Look up the Stitch folder name in `screens-map.md` and find:

- Target app: Stores-FE or Stores-Admin.
- Target route / file path.
- Whether the page exists (refactor) or is new (create).

### 2. Confirm scope with the user (if ambiguous)

If the screens-map lists multiple variants (e.g. `homepage_1` / `_2` / `_3`)
ask which one before writing code.

### 3. Pick the layout shell

From `layouts.md`:

- Public marketplace pages → marketplace shell (sticky nav + sections).
- Account / dashboard pages → dashboard shell (sidebar + glass header).

The shell must reuse the existing layout components in
`Stores-FE/components/Layouts/` or `Stores-Admin/src/components/Layouts/`.
Update the shell's internal styling (Tailwind classes) to Kinetic if it
hasn't been already.

### 4. Convert section-by-section, Tailwind-first

For each `<section>` in the Stitch HTML:

- Keep the same Tailwind classes the Stitch HTML uses — they map 1:1 to
  the new tokens after you add them to the tailwind config.
- `class="…"` → `className="…"`. `for="…"` → `htmlFor="…"`. Self-close
  void elements (`<img />`, `<input />`).
- Inline `style="font-variation-settings: 'FILL' 1"` →
  `style={{ fontVariationSettings: "'FILL' 1" }}`.
- Wire any list/grid items to the existing data source if the page
  already has one; otherwise leave a `// TODO: wire data` comment with a
  clear shape (e.g. `Auction[]`).
- Apply mobile-first responsive prefixes per `responsive.md` — Stitch
  HTML usually already has these; preserve them.

### 5. Handle assets

- Stitch image URLs (`https://lh3.googleusercontent.com/…`) are
  placeholders. Replace with project images or leave as-is for review,
  flagging them in the final report.
- `material-symbols-outlined` icons stay as-is (they're a font, not a
  component). Ensure the font link is in `Stores-FE/app/layout.tsx` (or
  the Admin `index.html`) — add if missing.

### 6. Tokens

If the Stitch HTML uses a class that isn't yet in the tailwind config
(e.g. `bg-secondary-fixed-dim`), add it under `theme.extend.colors`
following the names in `tokens.md`. Don't hardcode hex in JSX.

### 7. Verify responsive

Before reporting success, verify by inspection:

- 375px: no horizontal overflow, text readable, no stacked tap targets <44px.
- 768px: sidebar reappears (dashboards) or 2-col grids work (marketplace).
- 1024px: full layout.
- 1440px: content respects `max-w-screen-2xl` (no edge-bleed).

If you started a dev server, instruct the user to verify in browser.

## Hard rules

- **Tailwind-only styling.** No CSS-in-JS, no CSS modules, no UI-library
  components for layout/visuals.
- Don't touch `Stores-FE/components/Navigation/` or `Stores-Admin` nav
  components. Shells in `Layouts/` are fair game.
- No new npm packages without flagging it.
- Add missing tokens to the right `tailwind.config.*`. Don't hardcode hex.
- Preserve back-compat: legacy tokens stay in the config.

## Final report (concise)

```
Ported: <stitch folder> → <file path>
Layout: marketplace | dashboard
New tokens added: <list or "none">
TODOs: <list or "none">
Responsive: verified at 375/768/1024/1440 (or "user must verify")
```
