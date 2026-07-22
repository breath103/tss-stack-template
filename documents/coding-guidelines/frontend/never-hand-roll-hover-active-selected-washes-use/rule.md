# Never hand-roll hover/active/selected washes — use `button-bg-overlay`

The state washes are already one utility. `global.css`:

```css
@utility button-bg-overlay { @apply hover:bg-highlight2 active:bg-highlight3 aria-selected:bg-highlight1; }
```

`--highlight1/2/3` are accent-1 at 0.3 / 0.2 / 0.1 alpha — **1 = selected, 2 = hover,
3 = active**. So `bg-accent-1/10` is a hand-rolled `--highlight3`: a duplicate token *and* the
pressed intensity used for selection. Mark the selected element `aria-selected` and let the
utility paint it; add only what the utility doesn't own (text color, weight).

Use `button-bg-surface1` / `button-bg-surface2` where the element needs an opaque wash
(sticky rows, popovers) instead of a transparent overlay.

```tsx
// ❌ Wrong — re-declares the utility's hover, hand-rolls highlight3, and paints
// "selected" with the pressed intensity
const active = { className: "bg-accent-1/10 font-medium text-accent-1 hover:bg-highlight2" };
<Link className="button-bg-overlay text-text-3" activeProps={active} />
```

```tsx
// ✅ Correct — the utility owns every background; the class adds only text/weight
<Link
  className="button-bg-overlay text-text-3 hover:text-text-1 aria-selected:font-medium aria-selected:text-text-1"
  activeProps={{ "aria-selected": true }}
/>
```

TanStack `<Link>` takes `activeProps={{ "aria-selected": true }}`; plain controls take
`aria-selected={selected}` (see `ProjectSidebar.tsx`, `EditorBubbleMenu.tsx`, `IconToggle.tsx`).

Same principle for **geometry**: `ButtonLabel` (the primitive inside `Button`) owns height,
padding, gap, and icon size, and renders a square when given an icon and no text. An element
that can't be a `Button` — e.g. a `<Link>`, since `Button` renders a `<button>` and has no
`asChild` — should still render `<ButtonLabel>` rather than re-deriving those numbers, or it
drifts (`size-4` vs `size-5`, three different boxes in one rail).
