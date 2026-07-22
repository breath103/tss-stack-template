# Skeleton bars: use the `<Skeleton>` primitive — never hand-roll `animate-pulse` divs

Every skeleton placeholder bar (text stand-in, chip, avatar, date pill) must use the shared `<Skeleton>` component from `@/components/ui/Skeleton`. Do not hand-roll `<div className="animate-pulse ... bg-..." />` even once — not even "just this one tiny inline bar." Override sizing/shape via `className` (e.g. `rounded-full`, `rounded-sm`, `size-4`) and let the primitive own animation + color.

```tsx
// ✅ Correct — primitive owns animation + color; caller sizes/shapes
import { Skeleton } from "@/components/ui/Skeleton";
<Skeleton className="h-4 w-32" />
<Skeleton className="h-5 w-16 rounded-full" />        // pill — overrides rounded-md
<Skeleton className="size-8 rounded-full" />          // avatar
<Skeleton className="h-3 rounded-sm" style={{ width: 56 }} />  // dynamic width
```

```tsx
// ❌ Wrong — hand-rolled div duplicates the primitive
<div className="h-3 w-24 animate-pulse rounded-sm bg-text-3/30" />

// ❌ Wrong — hand-rolled with bg-surface-2 (also invisible in light mode, see below)
<div className="h-3 w-24 animate-pulse rounded-sm bg-surface-2" />
```

**Why centralize.** The skeleton primitive sets `bg-text-3/30`, not `bg-surface-*`. In light mode `--surface-2` is `color-mix(in oklch, var(--bg-seed), var(--tint-seed) 75%)` — i.e. mixed 75% of the way toward pure white, which is *lighter* than the row background. A skeleton painted with `bg-surface-2` renders as a near-invisible white-on-white ghost. Every hand-rolled skeleton historically gets this wrong; the primitive is the only place that knows the right color, and every callsite delegating to it gets the fix for free if the rule changes again.

This rule is about skeleton bars only. `bg-surface-*` is correct for actual resting surfaces — cards, panels, popover bodies, goal-row tint, etc. The mistake is reusing surface tokens for elements that need to *contrast* with a surface.
