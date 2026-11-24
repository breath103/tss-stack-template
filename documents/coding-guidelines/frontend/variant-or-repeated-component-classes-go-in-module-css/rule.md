---
topic: CSS and classNames
order: 20
---

# When a component has variant axes, renders many times per screen, or is a long one-off block with no contract, put its classes in a colocated .module.css.

These class strings leave the JSX for a colocated `<Component>.module.css`, never for a JS
constant (`frontend/where-class-strings-live`).

| Situation | Home |
|---|---|
| A one-off long block with no contract (a hero card, a sticky shell) | A colocated `<Component>.module.css` with `@apply`. |
| Rendered many times per screen, or has variant × size × color axes | A colocated `.module.css`, one class per variant value. |

```css
/* PaymentCard.module.css — a one-off */
@reference "../../global.css";

.card {
  @apply rounded-md border p-4;
}
```

For a component rendered many times per screen (toolbar buttons, tag-row badges, list cells),
each DOM node carries one short hashed class instead of a 250-character string. When it has
variant × size axes, every variant value is its own class and the component composes them;
don't merge the axes into one class with internal branching.

```css
/* Badge.module.css */
.base        { @apply inline-flex items-center rounded-md border; }
.variantSoft { @apply bg-surface-2; }
.variantBold { @apply bg-accent-1; }
.sizeS       { @apply h-6 px-2; }
.sizeM       { @apply h-8 px-3; }
```

```tsx
<span className={cn(styles.base, styles[variantClass], styles[sizeClass], className)} />
```

Primitives that render once or twice per screen (an input, a dialog) keep inline Tailwind.
