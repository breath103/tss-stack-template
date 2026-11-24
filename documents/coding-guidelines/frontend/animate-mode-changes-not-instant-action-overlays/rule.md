---
topic: Animation
order: 10
---

# When you add a menu, popover, picker or tooltip, open and close it instantly, with no animation.

**Instant-action surfaces — open and close with NO animation:** context menus,
popovers, dropdown/select menus, pickers, comboboxes / inline `@`-autocomplete,
tooltips, command palettes. The user already knows what they want *before* they
open one — they clicked or typed to get here. An enter/exit fade or slide just
delays the thing they came for and reads as sluggish. Snap them in and out.

Overlays that change the mode (modals, sheets, toasts) get the opposite treatment:
`frontend/animate-modals-sheets-toasts-and-route-transitions`.

Beyond feel, animating an instant-action surface is an active footgun: an
animation-gated unmount (e.g. Radix `Presence` waiting for `animationend`) can
leave the surface stuck open if that event never fires — as happens for a menu
portalled into a detached React root. No animation, no hang.

```tsx
// ✅ Context menu / popover / picker: instant, no animation classes
<PopoverPrimitive.Content
  className="rounded-md border bg-surface-2 p-1 shadow-md"
/>
```

```tsx
// ❌ Context menu with enter/exit fade — delays a known action, and the
//    animation-gated unmount can hang the panel open.
<PopoverPrimitive.Content className={cn(
  "data-[state=open]:animate-in data-[state=open]:fade-in-0",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
)} />
```
