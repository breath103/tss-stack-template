# `global.css` is for *shared* design tokens — don't add single-use palettes

A chart, badge family, or component that needs N visually distinct colors is not a reason to register `--chart-1`…`--chart-N` in `global.css`. Tokens in the global stylesheet are a shared contract — once they exist, any component can depend on them, and removing one breaks callers you don't know about.

Derive the palette *locally* by rotating hue off an existing accent token. One-off, scoped to the component's own file, no global fallout.

```ts
// ✅ Correct — colors derived from --primary at the callsite, no globals
const TYPE_KEYS = Object.keys(TYPE_LABELS) as TypeKey[];
const HUE_STEP = 360 / TYPE_KEYS.length;
export const TYPE_COLOR = Object.fromEntries(
  TYPE_KEYS.map((key, i) => [
    key,
    `oklch(from var(--primary) l c calc(h + ${i * HUE_STEP}))`,
  ]),
) as Record<TypeKey, string>;
```

```css
/* ❌ Wrong — nine categorical slots nobody else will ever use */
:root {
  --chart-1: oklch(0.64 0.17 45);
  --chart-2: oklch(0.70 0.16 55);
  /* ...through --chart-9 */
}
```

Threshold: a token belongs in `global.css` once **three unrelated components** need the same value. Until then, derive it where you use it.
