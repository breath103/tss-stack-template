---
topic: Text and sizes
order: 10
---

# When you write body, empty-state or modal copy, use text-base, even if the neighbouring file uses text-sm; text-sm and text-xs are for dense rows, counts and captions.

The default size for body text is **`text-base`** — the theme's own scale names it "body"
(`--text-base` in `modules/ui/src/theme/theme.css`). `text-sm` is "dense UI, secondary
rows" and `text-xs` is "counts, captions, meta": both are density choices, not defaults.
Reach for `text-sm` or `text-xs` only when something concrete forces it.

Agents reach for the small variants reflexively — a paragraph becomes `text-sm` because
the neighbouring sidebar is `text-sm`, a label "that's just metadata" becomes `text-xs` —
and the app ends up with prose rendered at dense-chrome size, harder to read than the
design intends. Small is not neutral: it is a deliberate density choice, and it costs
legibility every time.

**"The file next to it uses `text-sm`" is not a reason. "It's secondary" is not a reason.**
Copying a size from dense chrome (a sidebar, a table, a list row) onto prose is exactly the
mistake this rule exists to stop.

Real reasons for going smaller, all of which are visible in the layout:

- The text is genuinely dense UI: a sidebar item, a table cell, a list row's secondary
  line, a toolbar label — a strip whose density is the point.
- The element is inline *inside* a smaller run and must not outgrow it.

Surfaces that are read rather than scanned — onboarding screens, empty states, intros,
modal descriptions, long-form rich text — use `text-base` or larger. A screen meant to read
like a landing page steps the whole scale up (`text-lg` body, `text-2xl` title), not down.

Lint (`local/no-small-text-in-modal-form`) rejects `text-sm` / `text-xs` written inside a
`<ModalForm>`. Everywhere else the size is your call, and this guide is the only check.

```tsx
// ❌ Wrong — prose at dense-chrome size, copied from the sidebar
<p className="text-sm text-text-1">{i18n.welcome}</p>
```

```tsx
// ✅ Correct — body text at the body size
<p className="text-text-1">{i18n.welcome}</p>

// ✅ Correct — dense on purpose, where density is the point
<span className="truncate text-sm text-text-3">{user.email}</span>
```

When a whole surface genuinely needs to be dense, make that a property of the surface and
apply it consistently — don't shrink one element at a time.
