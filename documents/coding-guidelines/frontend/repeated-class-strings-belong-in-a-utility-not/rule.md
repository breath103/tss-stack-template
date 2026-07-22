# Repeated class strings belong in a `@utility`, not a JS constant

If the same Tailwind class string shows up in three or more JSX sites, promote it to a custom `@utility` in `global.css`. A local `const BTN = "..."` in one file is marginally better than copy-paste — across files it's pure duplication with no single source of truth.

**But `global.css` is for design-system-worthy shapes only.** If the repeated string is a route-local convention (one feature's label style) rather than a primitive every screen should share, extract a small component in that route instead — or leave the repetition. Promoting feature-local styling to a global utility is over-promotion, not dedup.

An `@utility` gives you one class name per callsite, one place to tune hover/active/focus, and participates in Tailwind's ordering/conflict resolution (unlike a JS string, which Tailwind's merger doesn't see). Rule: never name a class-string constant `BTN` or `CLS`; if you must extract one locally, suffix it `ClassName` and keep it file-local.

```tsx
// ❌ Wrong — same 6-class string copy-pasted across 7 files
const BTN = "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted";
<button className={BTN}>...</button>
// ...same string repeated in 6 other files
```

```css
/* ✅ Correct — shared utility in global.css */
@utility icon-ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  color: var(--muted-foreground);
  background-color: transparent;
  transition: background-color 150ms ease, color 150ms ease;
  &:hover  { background-color: color-mix(in oklch, var(--muted) 50%, transparent); color: var(--foreground); }
  &:active { background-color: color-mix(in oklch, var(--muted) 70%, transparent); }
}
```

```tsx
// ✅ Callsite collapses to one class
<button type="button" className="icon-ghost-button"><X size={16} /></button>
```

`@utility` is the right hammer for **one shared shape** (no variants). The moment the component has variant / size / color axes — buttons, badges, chips — reach for a colocated `.module.css` instead (see "Heavy-rendered atoms: prefer a colocated `.module.css`" above). One `@utility` per variant value bloats `global.css` and forfeits the per-component locality.
