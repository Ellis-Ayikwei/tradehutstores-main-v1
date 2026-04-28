---
name: restyle-component
description: Quickly restyle a single existing React component (no structural change, no behavior change) by swapping legacy Tailwind classes for Kinetic design tokens. Lighter-weight alternative to apply-design-tokens for one focused file.
---

# Skill: restyle-component

## When to use

User points at one component file (e.g. `components/Products/ProductCard.tsx`)
and says "make it match the new design" without asking for structural changes.

## How

Use the token swap table from
`.claude/skills/apply-design-tokens/SKILL.md`. Walk the file once.

## Tailwind-only

Same constraint as every other skill: utility classes only, no CSS-in-JS,
no third-party design components, no inline `style={{}}` except for
computed values.

## Hard rules

- Don't change props, hooks, or event handlers.
- Don't restructure JSX.
- Don't touch nav components.
- If a token is missing, add it to the tailwind config (don't hardcode hex).

## Output

```
Restyled: <file path>
Tokens swapped: <count>
Behavior changed: NO
```
