# Use the in-house component — never hand-roll a styled clone

If `packages/frontend/src/components/ui/` (or another shared module) already
ships a primitive for what you're rendering, USE IT. Don't write a raw
`<button className="rounded-md bg-accent-1 px-3 py-1.5 ...">`, don't
hand-roll a `<input type="date">` with custom chrome, don't compose your own
chip with `<span className="rounded-full bg-..."/>`. Every hand-rolled
callsite diverges from the canonical in at least one detail — focus ring,
hover/active state, disabled opacity, dark-mode contrast, keyboard
behaviour, ARIA wiring — and the bug stays invisible until design QA.

The primitive owns those details. Reuse buys: one place to tune them, one
place to fix bugs, automatic consistency across screens, free participation
in design-system refactors. A bespoke clone forfeits all of that to save
five seconds.

Non-exhaustive — if it's in `components/ui/` or has a clear shared owner,
prefer it over a raw element + Tailwind. Current primitives include:

| Use | Instead of |
|---|---|
| `Button` (`components/ui/Button`) | raw `<button className="...">` |
| `Input` (`components/ui/Input`) | raw `<input>` / `<textarea>` (single + multi-line, autoresize) |
| `Badge` (`components/ui/Badge`) | raw `<span className="rounded-full bg-...">` chips |
| `Checkbox` (`components/ui/Checkbox`) | raw `<input type="checkbox">` |
| `DatePicker` / `DateRangePicker` | raw `<input type="date">` with custom chrome |
| `Selector` (`components/ui/Selector`) | raw `<select>` with custom styling |
| `PersonPicker` | hand-rolled user-search dropdowns |
| `MarkdownEditor` | hand-rolled rich-text textareas |
| `Spinner` | hand-rolled SVG / CSS animations |
| `Skeleton` | hand-rolled pulsing `<div>`s |
| `dialog` / `modal` / `sheet` | hand-rolled `<div className="fixed inset-0">` overlays |
| `Popover`, `HoverCard` | hand-rolled floating menus |
| `ConfirmDialog` | hand-rolled "are you sure?" overlays |

```tsx
// ❌ Wrong — bespoke styled button
<button
  type="button"
  onClick={onSubmit}
  className="rounded-md bg-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1-fg hover:bg-accent-1/90 active:scale-95 disabled:opacity-50"
>
  Submit
</button>

// ❌ Wrong — bespoke date input
<input
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  className="rounded-sm border bg-surface-2 px-2 py-1 text-sm"
/>

// ❌ Wrong — bespoke chip
<span className="rounded-full bg-accent-1/15 px-2 py-0.5 text-xs font-medium">
  사람
</span>
```

```tsx
// ✅ Correct — use the primitive
<Button variant="accent1" size="sm" onClick={onSubmit}>Submit</Button>

<DatePicker value={date} onChange={setDate} />

<Badge color="blue">사람</Badge>
```

The rule kicks in whenever the bespoke version exists *only* to skin a
native element — i.e. it's pure presentation that the primitive already
owns. If the in-house component genuinely doesn't cover the case (a new
interaction shape, a one-off layout that isn't a "button" / "input" / etc.),
that's fine — but consider whether the primitive should be extended instead
of cloned.

Carve-outs:

- **Plain `<button>` to wrap a clickable card / list row** when you want
  the focus / keyboard / aria-selected semantics without the visual chrome
  of a `Button` (e.g. ticket cards in a kanban column). The `Button`
  variants are for actual button-shaped affordances.
- **Plain `<input type="checkbox">`** inside a multi-line label is fine
  when the canonical `Checkbox` doesn't fit the layout — but consider
  extending `Checkbox` first.
- **`<input type="time">`** carved out by the date-picker rule already.

When unsure: grep `components/ui/` for the primitive name before writing
anything new.
