---
topic: Text and sizes
order: 20
---

# When you add a Button, ButtonLabel or Selector, leave it at size="m"; use size="s" only when the layout forces it.

The default size for a `Button` / `ButtonLabel` / `Selector` is **`"m"`**. Reach for
`size="s"` only when something concrete forces it.

Agents reach for the small variants reflexively — a button "inside a row" becomes
`size="s"`. Small is not neutral: it is a deliberate density choice, and it costs legibility
every time. "The file next to it uses it" is not a reason.

Real reasons for going smaller, all of which are visible in the layout:

- The control sits in a strip whose height is fixed by something else (a toolbar rail, a
  table cell, a chip's inline dismiss).
- The element is inline *inside* a smaller run and must not outgrow it.

```tsx
// ❌ Wrong — a small button next to prose, copied from the sidebar
<Button variant="accent1" size="s" text={i18n.install} />
```

```tsx
// ✅ Correct — the default button size
<Button variant="accent1" size="m" text={i18n.install} />
```

When a whole surface genuinely needs to be dense, make that a property of the surface and
apply it consistently — don't shrink one element at a time.
