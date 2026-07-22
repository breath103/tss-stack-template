# Don't add hypothetical optional props

When extracting a component, only ship the props *current* callers need. A `size` prop with no caller using a non-default value, a `className` override "for flexibility," an `iconSize` knob "in case we reuse this later" — all dead weight. They widen the API surface, force every future reader to understand the permutations, and tend to rot into lies (the default gets tuned and the "other" size path breaks silently).

Add the optional prop the moment a second caller actually needs a different value. Not before.

```tsx
// ❌ Wrong — size, iconSize, and className all land unused
export function MemoryTypeBadge({
  type,
  size = 7,         // nobody passes size=8
  iconSize = 14,    // nobody overrides
  className,        // only one caller; could be inlined there
}: { type: MemoryType; size?: 7 | 8; iconSize?: number; className?: string }) { ... }
```

```tsx
// ✅ Correct — just what callers actually pass today
export function MemoryTypeBadge({ type, className }: { type: MemoryType; className?: string }) {
  ...
}
```
