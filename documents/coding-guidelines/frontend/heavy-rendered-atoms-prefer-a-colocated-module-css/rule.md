# Heavy-rendered atoms: prefer a colocated `.module.css` over inline Tailwind

When a component is likely to render many times on a single screen — buttons in a toolbar/grid, badges in a tag row, checkboxes in a list, list-row cells — move its Tailwind to a colocated `<Component>.module.css` using `@reference "../../global.css"; … @apply …`. Each rendered DOM node gets one short hashed class instead of a 250+ character Tailwind blob.

The HTML payload difference at scale is real: at ~300 chars per `class="…"` × 100 buttons on a screen, you save ~30KB on every render and the DevTools "Elements" panel becomes readable.

**The CVA-shaped variant rule.** When the component has N variants × M sizes × P colors (the `cva` shape), each variant value gets its own class in the module — `.variantDefault`, `.variantAccent1`, `.sizeSm`, `.sizeDefault`, `.colorBlue`, etc. The component composes the final className via `cn(styles.base, styles[variantClass], styles[sizeClass], className)`. Don't merge a `cva`-shaped surface into one mega-class with internal branching — variants stay disjoint.

```css
/* ✅ Correct — Button.module.css; base + 6 variants + 6 sizes, each its own class */
@reference "../../global.css";

.base               { @apply inline-flex items-center justify-center rounded-md border …; }
.variantDefault     { @apply bg-surface-2 text-text-1 hover:bg-highlight-1; }
.variantAccent1     { @apply bg-accent-1 text-accent-1-fg hover:opacity-90; }
/* …4 more variants… */
.sizeSm             { @apply h-8 px-3 text-xs; }
.sizeDefault        { @apply h-9 px-4; }
/* …4 more sizes… */
```

```tsx
// ✅ Correct — lookup tables compose by name, callsite stays one-line
const VARIANT_CLASS: Record<Variant, string> = { default: styles.variantDefault, accent1: styles.variantAccent1, /* … */ };
const SIZE_CLASS:    Record<Size,    string> = { sm: styles.sizeSm, default: styles.sizeDefault, /* … */ };

<button className={cn(styles.base, VARIANT_CLASS[variant], SIZE_CLASS[size], className)} />
```

**When the module beats `@utility`:** if you have one shared shape with no variants, prefer a custom `@utility` in `global.css` (see "Repeated class strings belong in a `@utility`" below — it's the simpler hammer). Reach for a colocated `.module.css` once the component has variant/size/color axes — modules let you keep each axis disjoint without polluting `global.css` with per-component utilities.

**Out of scope:** primitives that render 1–N per screen (Input, Select, DatePicker, dialog, modal). The DOM payload argument doesn't bite at low counts, and inline Tailwind on a `cn()` callsite is easier to scan.
