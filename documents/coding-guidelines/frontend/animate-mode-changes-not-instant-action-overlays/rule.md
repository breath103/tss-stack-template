# Animate mode changes, not instant-action overlays

Overlays split into two kinds by user intent, and they get opposite treatment.

**Instant-action surfaces — open and close with NO animation:** context menus,
popovers, dropdown/select menus, pickers, comboboxes / inline `@`-autocomplete,
tooltips, command palettes. The user already knows what they want *before* they
open one — they clicked or typed to get here. An enter/exit fade or slide just
delays the thing they came for and reads as sluggish. Snap them in and out.

**Mode changes — MUST animate:** modals / dialogs, sheets / drawers, toasts /
notifications, full-screen or route transitions. Here the user needs to register
"the context changed"; motion IS the feedback that says "you're in a new mode
now." Follow the timing:
- **Enter:** 150–220ms, `ease-out`. **Exit:** 120–180ms, `ease-in` (always shorter).
- Pair opacity with motion (modals scale `0.95→1`; sheets slide from the edge).
  Backdrops fade only, no transform.
- If open state is driven by a route change, keep the overlay mounted long enough
  for the exit animation to finish.

Beyond feel, animating an instant-action surface is an active footgun: an
animation-gated unmount (e.g. Radix `Presence` waiting for `animationend`) can
leave the surface stuck open if that event never fires — as happens for a menu
portalled into a detached React root. No animation, no hang.

```tsx
// ✅ Context menu / popover / picker: instant, no animation classes
<PopoverPrimitive.Content
  className="rounded-md border bg-surface-2 p-1 shadow-md"
/>

// ✅ Modal: mode change, animate in and out
<DialogContent className={cn(
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200 data-[state=open]:ease-out",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150 data-[state=closed]:ease-in",
)} />
```

```tsx
// ❌ Context menu with enter/exit fade — delays a known action, and the
//    animation-gated unmount can hang the panel open.
<PopoverPrimitive.Content className={cn(
  "data-[state=open]:animate-in data-[state=open]:fade-in-0",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
)} />
```
