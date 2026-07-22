# Reference Tailwind in CSS modules with `@reference "../../global.css"` — never `@import`

CSS modules must NOT `@import "tailwindcss"`. `@import` actually re-emits Tailwind's full CSS into every importing file and creates an HMR cascade — change any utility anywhere and every CSS module that imports Tailwind invalidates, taking every component that imports those modules with it.

For plain CSS that needs no Tailwind utilities, just write plain CSS — no directive at all.

For a CSS module that needs to `@apply` Tailwind utilities (the heavy-rendered-atom pattern below), use Tailwind v4's `@reference` directive **pointing at `global.css`**, not at the `tailwindcss` package:

```css
/* ✅ Correct — @reference is metadata-only (no CSS emitted),
 *    and global.css carries our custom @theme tokens + custom utilities. */
@reference "../../global.css";

.base {
  @apply inline-flex items-center justify-center rounded-md border bg-surface-2 text-text-1;
}
```

**Why `global.css`, not `tailwindcss`?** `@reference "tailwindcss"` only exposes the *framework's default theme* — `bg-white`, `text-zinc-500`, etc. Our custom tokens (`bg-background`, `bg-surface-1`, `text-accent-1`, `border-accent-1`, `text-text-1`, `text-text-2`, `text-text-3`, `bg-highlight-1`, `bg-error`, `text-error-fg`, …) are declared in `global.css`'s `@theme inline {…}` block. Same for our custom utilities (`text-tracker`, `text-display`, `text-data`). Referencing `tailwindcss` directly fails with `Cannot apply unknown utility class 'bg-background'`. And since the **"Never use hardcoded colors — always use design tokens"** rule means every `@apply` we write will reach for these tokens, `@reference "../../global.css"` is the only path that works in this codebase.

```css
/* ❌ Wrong — emits all of Tailwind into this module + HMR cascade */
@import "tailwindcss";

.button { @apply rounded-md bg-surface-2; }
```

```css
/* ❌ Wrong — references only the framework default theme;
 *    @apply on any custom token (bg-background, text-accent-1, …) fails. */
@reference "tailwindcss";

.button { @apply rounded-md bg-surface-2; }  /* Cannot apply unknown utility class 'bg-surface-2' */
```

**Marker classes are not `@apply`-able.** Tailwind v4 treats `group` and `peer` (and their named forms like `group/badge`) as variant markers, not utilities. They cannot appear inside `@apply`. Add them as literal class names in JSX alongside your module class:

```tsx
// ✅ Correct — `group` lives in JSX; descendant `group-hover:*` selectors inside
// the module's @apply work because the DOM ancestor carries the marker class.
<label className={cn("group", styles.label)}>
  <input className={cn("peer", styles.input)} />
  <span className={styles.box}>{icon}</span>     {/* uses peer-checked:, group-hover: */}
</label>
```

```css
/* ❌ Wrong — `group` and `peer` are not utilities; build fails */
.label { @apply group inline-flex …; }
.input { @apply peer sr-only; }
```
