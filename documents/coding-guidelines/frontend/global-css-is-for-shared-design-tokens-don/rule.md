---
topic: CSS and classNames
order: 50
---

# When you want to add a token, keyframe or utility to global.css, do it only if 3+ unrelated components use it; otherwise keep it in the component.

Everything in the global stylesheets (`packages/frontend/src/global.css`,
`modules/ui/src/theme/theme.css`) is a shared contract: once it exists any component can depend
on it, and removing it breaks callers you don't know about. A token, `@keyframes` or `@utility`
belongs there once **three unrelated components** need the same value. Until then it lives with
the one component that uses it.

**A palette.** A chart or badge family that needs N distinct colors derives them locally from
an existing token instead of registering `--chart-1`…`--chart-N`:

```ts
// ✅ Correct — colors derived at the call site, no globals
const TYPE_KEYS = Object.keys(TYPE_LABELS) as TypeKey[];
const HUE_STEP = 360 / TYPE_KEYS.length;
export const TYPE_COLOR = Object.fromEntries(
  TYPE_KEYS.map((key, i) => [key, `oklch(from var(--accent-1) l c calc(h + ${i * HUE_STEP}))`])
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

**An animation.** A `@keyframes` block and the class that plays it go in the component's
colocated `.module.css`, not in `global.css`.
