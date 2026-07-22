# Interactive elements must have four distinct visual states

Every button, link, menu item, tab, or interactive control must visually distinguish **normal**, **hover**, **active** (pressed), and **selected** states, and transition between them smoothly.

| State | Meaning | Typical treatment |
|-------|---------|-------------------|
| **Normal** | Resting | Muted text, no fill |
| **Hover** | Pointer over | Subtle tinted fill + text shift |
| **Active** | Mouse/touch down | Stronger fill + slight compress (`active:scale-[0.98]`) |
| **Selected** | Represents the current route, value, or toggle-on state | Accent-tinted fill + accent text |

Rules:
- A selected element still needs working hover and active layers — don't just lock it to one style when selected.
- All visual changes must animate via `transition-all duration-150` (or narrower if needed). No abrupt snaps.
- Stateless triggers (e.g. sign out, close) have no selected state — use normal/hover/active only.
- Never use a single `hover:` with no `active:` — the press feedback is part of the design, not optional.

```tsx
// ❌ Wrong — only hover, no active, no transition
<button className="text-muted-foreground hover:bg-muted hover:text-foreground">
```

```tsx
// ❌ Wrong — selected locks out hover/active
<Link className={selected ? "bg-accent/10 text-accent" : "hover:bg-muted"}>
```
