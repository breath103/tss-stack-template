# Long inline classNames → break into `cn()`, one meaningful group per line

When a className you're keeping inline grows past the print width, don't leave it
as one runaway string and don't hoist it to a `const` (see
`never-extract-classnames-into-constants`) — wrap it with `cn()` and put **one
semantic group per line**, each labelled with a short `//` comment. The reader
scans the axes (surface, layout, enter/exit, per-side, per-state) instead of
parsing a 400-char wall.

This is the formatting rule for a string you've *decided to keep inline*. If the
string paints a reused *thing*, extract a component or a `.module.css` instead
(see `long-classnames-extract-component-or-module-css`) — that rule decides
*where* the styles live; this one decides *how* an inline string is shaped.

`enforce-consistent-line-wrapping` (oxlint-tailwindcss, `printWidth: 120`) gates
this mechanically: any single string literal over 120 chars errors, forcing the
split. A group that itself exceeds 120 is the signal to split it along its
natural sub-axis (per-state, per-side), not to widen the limit.

## ❌ Wrong — one runaway string

```tsx
<DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-out data-[state=closed]:duration-150 data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0" />
```

## ✅ Right — `cn()` with one meaningful group per line

```tsx
<DialogPrimitive.Overlay
  className={cn(
    // surface
    "fixed inset-0 z-50 bg-overlay",
    // exit
    "data-[state=closed]:animate-out data-[state=closed]:duration-150 data-[state=closed]:fade-out-0",
    // enter
    "data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0",
  )}
/>
```

## Carve-outs

- A className that already fits within the print width stays a single inline
  string — don't `cn()`-wrap a short one just to add group comments.
- Conditional groups (`side === "left" && "…"`) are themselves `cn()` args, one
  per line, same as static groups.
