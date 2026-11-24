---
topic: CSS and classNames
order: 90
---

# When you pick a color, use a design token; never white, black, a hex value or an arbitrary color class.

Never write hardcoded colors anywhere in component code. No `bg-[#FAFAF8]`, no `text-neutral-500`, no `border-gray-200`, no `bg-white`, no inline hex values. This applies to landing pages, marketing pages, app pages — every component without exception.

All colors must come from the design tokens defined in `packages/frontend/src/global.css`:

- **Background + surfaces (single-tone scale, mixed at increasing ratios):**
  - `bg-background` — the page itself. Has color (warm cream / dark forest). Sidebar, page chrome, sticky headers, the body — anything that IS the page sits on `--background`. NOT a surface; it's the canvas surfaces lift FROM.
  - `bg-surface-1` — `bg-mix(background, surface-tint, ratio × 1)`. Subtle lift. List-card containers, bordered row groups, debug rows, preview cards.
  - `bg-surface-2` — `bg-mix(background, surface-tint, ratio × 2)`. Mid lift. Raised panels, marketing mocks, callouts, focused-input surfaces.
  - `bg-surface-3` — `bg-mix(background, surface-tint, ratio × 3)`. Most elevated. Popovers, modals, sheets, context menus. Also the bg shadcn `bg-popover`/`bg-card` resolve to.
  - `bg-highlight-1` / `bg-highlight-2` / `bg-highlight-3` — semi-transparent overlays (~10–16% alpha) derived from `--accent-1`/`-2`/`-3`. Watered-down accent tints for hover states, tag chips, sub-regions inside a card. NOT numbered surface steps — they tint whatever is beneath them. Default to `bg-highlight-1` for chrome-y / accent-1 surfaces; pair `-2`/`-3` with the matching `color-accent-N` region.

  The whole scale is **one tint mixed at three ratios**. Don't introduce new surface levels via OKLCH manipulation (`l + 0.015`, `c × 0.7`) — adjust `--surface-tint` or the mix ratios in `global.css`, never fork the formula at the callsite.

  **Never `bg-surface-N/alpha`.** A surface is a deterministic mix at one of three ratios. Adding an alpha modifier (`bg-surface-2/70`, `bg-surface-3/40`, `bg-surface-1/60`) makes the rendered color depend on whatever's behind it — defeating the determinism, producing tones that don't exist in the scale. If you reach for `bg-surface-N/X`, the right token is one of: a different `bg-surface-N` (drop the alpha), `bg-highlight-N` (you wanted a tinted overlay, not a surface), or `bg-background/90 backdrop-blur` for sticky chrome (the documented exception — alpha is integral to the blur over scrolling content). Modal/dialog backdrops use `bg-black/40 backdrop-blur-sm`, not a surface.

  **Never inline shadow values.** No `shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)]` at the callsite. The shadow scale is in `global.css` `@theme`: `shadow-button` (small button), `shadow-card` (marketing mocks on landing — the default), `shadow-floating` (hero cards, one tier above card), `shadow-overlay` (popovers/modals/sheets — what `popover-surface` uses), `shadow-elevated` (heavy auth-card-on-dark). If none fit, add a new tier — never inline a one-off.
- **Text:** `text-text-1` (primary), `text-text-2` (secondary), `text-text-3` (tertiary)
- **Accents:** `text-accent-1`, `text-accent-2`, `text-accent-3` (and `bg-*` equivalents)
- **Borders:** `border-border`
- **State:** `text-error`, `text-success`

If you need a color that doesn't exist as a token, **stop and ask**. Either we add a new token to `global.css`, or we reuse an existing one. Never reach for `#FAFAF8`, `neutral-200`, or `gray-500` as a shortcut.

```tsx
// ✅ Correct — design tokens
<div className="bg-background text-text-1 border-border">
  <h1 className="text-text-1">Title</h1>
  <p className="text-text-2">Description</p>
</div>
```

```tsx
// ❌ Wrong — hardcoded hex
<div className="bg-[#FAFAF8] text-neutral-900 border-neutral-200">

// ❌ Wrong — Tailwind palette colors
<div className="bg-white text-gray-900 border-gray-200">

// ❌ Wrong — arbitrary values
<p className="text-[#666]">
```

This rule has zero exceptions. Hardcoded colors break theming, dark mode, and design system consistency. If you're tempted to hardcode a color "just for this one landing page," the answer is no — add a token instead.
