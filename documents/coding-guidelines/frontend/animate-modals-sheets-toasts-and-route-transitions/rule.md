---
topic: Animation
order: 20
---

# When you add a modal, sheet, toast or route transition, animate it in and out.

**Mode changes — MUST animate:** modals / dialogs, sheets / drawers, toasts /
notifications, full-screen or route transitions. Here the user needs to register
"the context changed"; motion IS the feedback that says "you're in a new mode
now." Follow the timing:
- **Enter:** 150–220ms, `ease-out`. **Exit:** 120–180ms, `ease-in` (always shorter).
- Pair opacity with motion (modals scale `0.95→1`; sheets slide from the edge).
  Backdrops fade only, no transform.
- If open state is driven by a route change, keep the overlay mounted long enough
  for the exit animation to finish.

Instant-action overlays (menus, popovers, pickers, tooltips) get the opposite treatment:
`frontend/animate-mode-changes-not-instant-action-overlays`.

```tsx
// ✅ Modal: mode change, animate in and out
<DialogContent className={cn(
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200 data-[state=open]:ease-out",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150 data-[state=closed]:ease-in",
)} />
```
