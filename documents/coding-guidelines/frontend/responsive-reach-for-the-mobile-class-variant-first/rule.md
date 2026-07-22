# Responsive: reach for the `mobile:` class variant first — JS viewport branching is a last resort

We're **desktop-first**: unprefixed classes are the desktop default, and the custom `mobile:` Tailwind variant (`@media (max-width: 767px)`, registered in `global.css`) overrides on phones. `flex-row mobile:flex-col` reads as "row on desktop, column on phone."

The escalation ladder — always stay on the lowest rung that works:

1. **A `mobile:` class selector.** Padding, gaps, hiding a thing (`mobile:hidden`), flow direction, font size, sticky offsets — all of it is pure CSS. No JS, no re-render, no breakpoint listener. This is the answer the overwhelming majority of the time.
2. **The shared `useIsMobile()` hook**, *only* when a **behavior** (not just styling) must differ — something CSS cannot express. Switching a framer-motion slide direction, not mounting a resize-handle listener, swapping a resizable sidebar for a full-screen modal. Read it once: `const isMobile = useIsMobile()`.
3. **A separate layout branch or a separate mobile component** — the last resort. Only when the two viewports are genuinely different *shapes* (see "Reuse the DOM tree across variants"), e.g. a desktop data-grid row vs. a mobile stacked card.

**Never hand-roll `window.matchMedia` in a component.** Viewport detection goes through the one shared `useIsMobile()` hook (`src/hooks/useIsMobile.ts`) — one listener, one source of truth. A `matchMedia` per component (or per list row) is N redundant listeners; if many rows need it, read it once high up and thread it down (context / prop), per "Optimize the dimension that scales with user data."

```tsx
// ❌ Wrong — JS branch + per-component matchMedia for what is pure styling
const isMobile = window.matchMedia("(max-width: 767px)").matches;
return <div className={isMobile ? "flex-col px-3" : "flex-row px-8"}>…</div>;
```

```tsx
// ✅ Correct — a class selector; no JS, no listener, no re-render
return <div className="flex-row px-8 mobile:flex-col mobile:px-3">…</div>;
```

```tsx
// ✅ Correct — useIsMobile() only because the *behavior* differs (CSS can't pick an animation)
const isMobile = useIsMobile();
const motionProps = isMobile ? { initial: { y: "100%" } } : { initial: { x: 24 } };
```
