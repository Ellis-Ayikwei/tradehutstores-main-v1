# Design System Specification v2.1

## 1. Creative North Star: "The Kinetic Gallery"
This design system moves away from the static, boxy nature of traditional e-commerce. Our goal is to create a "Kinetic Gallery"—an experience that feels as much like a high-end editorial magazine as it does a high-frequency trading floor. 

We achieve this through **Intentional Asymmetry** and **Tonal Depth**. We do not use lines to cage content; we use space and subtle shifts in value to guide the eye. The interface should feel like a series of layered, physical sheets of fine paper and frosted glass, organized with architectural precision.

---

## 2. Color & Surface Philosophy

### The Palette
- **Primary (Action):** `#F5620F` (International Orange). Use for high-intent actions and brand moments.
- **Bid-Green (Success/Growth):** `#00C48C`. Specifically for auction increments and "Place Bid" actions.
- **Request-Blue (Logic/RFQ):** `#2979FF`. Reserved for Request for Quote (RFQ) workflows and technical specifications.
- **Surface:** `#FFF8F6` (The primary canvas).

### The "No-Line" Rule
**Strict Mandate:** Prohibit the use of 1px solid borders for sectioning or containment. 
Boundary definition must be achieved through:
1.  **Background Shifts:** Place a `surface-container-low` section against a `surface` background.
2.  **Tonal Nesting:** Treat the UI as layers. A card (`surface-container-lowest`) sits on a section (`surface-container-low`), which sits on the global background (`surface`).
3.  **Negative Space:** Use the spacing scale to create "invisible" gutters that are more effective than lines.

### Glass & Gradient Transitions
To prevent a "flat" look, use **Glassmorphism** for floating elements (e.g., sticky headers, floating action buttons).
- **Surface Glass:** `surface` color at 70% opacity with a `24px` backdrop-blur.
- **Signature Glow:** For primary CTAs, use a subtle linear gradient: `primary` (#a43d00) to `primary_container` (#f5620f).

---

## 3. Typography: The Editorial Voice

Our typography is a conversation between architectural strength and functional clarity.

- **Display & Headlines (Syne):** Use Syne for all high-level headers. Its wide stance and unique letterforms provide a custom, "boutique" feel. 
    - *Usage:* `display-lg` through `headline-sm`. Tighten tracking by -2% for headers.
- **Body & UI (DM Sans):** The workhorse. DM Sans provides high legibility for product descriptions and metadata.
    - *Usage:* `title-lg` through `body-sm`.
- **Data & Price (JetBrains Mono):** This is our "Trust Layer." All prices, bid amounts, and SKU numbers must use JetBrains Mono. Its monospaced nature conveys technical precision and mathematical honesty.

---

## 4. Elevation, Depth & The Layering Principle

We reject the standard "drop shadow" in favor of **Ambient Occlusion** and **Tonal Layering**.

### The Layering Principle
Depth is created by stacking Material surface tokens:
- **Level 0 (Base):** `surface` (#FFF8F6)
- **Level 1 (Section):** `surface-container-low` (#FFF1EC)
- **Level 2 (Component):** `surface-container-lowest` (#FFFFFF)

### Ambient Shadows
For product cards, utilize the custom shadow tokens:
- **`shadow-card`**: A multi-layered shadow using `on-surface` at 4% opacity. 
  - *Values:* `0 4px 20px 0 rgba(38, 24, 19, 0.04), 0 1px 2px 0 rgba(38, 24, 19, 0.02)`
- **`shadow-card-hover`**: Increase spread and move the Y-offset.
  - *Values:* `0 12px 32px 0 rgba(38, 24, 19, 0.08)`

### Ghost Borders
If containment is required for accessibility in low-contrast areas, use a **Ghost Border**:
- **Token:** `outline-variant` at 15% opacity. Never use 100% opacity for structural lines.

---

## 5. Core Components

### Buttons: The Action Suite
All buttons use `rounded-md` (0.75rem) and `label-md` (Syne or DM Sans Bold).
- **Primary:** Gradient (`primary` to `primary_container`), White text.
- **Bid-Green:** `#00C48C` background, White text. High-energy, used only for financial commitment.
- **Request-Blue:** `#2979FF` background, White text. Used for "Request Quote."
- **Outline:** `outline` token (Ghost Border style), `on-surface` text.

### Auction & RFQ Cards
The crown jewel of this design system. 
- **Layout:** Use intentional asymmetry. The image should slightly "break" the container or sit on a shifted background plane.
- **Price Display:** Must be `font-mono` (JetBrains Mono).
- **Badges:** Use `surface-container-highest` for background with `on-surface-variant` text. Avoid "traffic light" colors for status badges unless they are critical errors; keep them tonal.

### Input Fields
- **Background:** `surface-container-low`.
- **Active State:** Change background to `surface-container-lowest` and apply a `primary` Ghost Border (20% opacity).
- **No Underlines:** Use solid tonal blocks rather than simple underlined inputs.

---

## 6. Do’s and Don’ts

### Do
- **Do** use `epilogue` (or Syne) for large, expressive price displays in hero sections to create an "editorial" feel.
- **Do** lean into `surface-variant` for secondary information blocks to create "islands" of content.
- **Do** ensure that every `font-mono` element is vertically aligned for mathematical clarity.

### Don’t
- **Don’t** use black (`#000000`). Use `on-surface` (#261813) for all "black" text to maintain tonal warmth.
- **Don’t** use a divider line between list items. Use 16px or 24px of `surface-container-low` padding to separate them.
- **Don’t** use standard "Rounded-Full" (pills) for everything. Reserve `rounded-full` for status badges; use `rounded-md` or `rounded-lg` for cards and buttons to maintain an architectural, sophisticated edge.

### Accessibility Note
While we prioritize high-end aesthetics, ensure `on-surface` text against `surface` backgrounds maintains a minimum contrast ratio of 4.5:1. When using the `primary` orange, use it for large elements or pair it with the dark `on-primary-container` for small text.