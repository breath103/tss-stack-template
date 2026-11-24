---
topic: Types and schemas
order: 60
---

# When you branch on a discriminated union or a string-literal union, use an exhaustive switch, not an if/else chain.

When handling a discriminated union OR any string-literal union (a `mode`, a
`kind`, a `view`, etc.), always use a `switch` statement on the discriminant.
Never use a nested ternary, and never use `if`/`else if` chains. `switch`
preserves exhaustiveness checking — the compiler catches missing cases — and
the resulting code reads top-to-bottom instead of folding back on itself.

This applies to the backend and the frontend alike. The frontend breaks it more
often because JSX inline-expression positions tempt you into "clever" nested
ternaries that other readers have to mentally unfold.

```typescript
// ✅ Correct - switch on discriminant, exhaustive
switch (result.status) {
  case "installed": break;
  case "authentication": window.location.href = result.url; break;
}
```

```typescript
// ❌ Wrong - if/else loses exhaustiveness checking
if (result.status === "authentication") {
  window.location.href = result.url;
}
```

## ❌ Wrong — nested ternary chain

```tsx
// Three layers deep, indent grows with each branch, exhaustiveness gone.
const scenarios: Scenario[] = mode === "intersect" ? INTERSECT_SCENARIOS
  : mode === "include" ? [INCLUDE_SCENARIO]
    : mode === "start" ? [START_SCENARIO]
      : [END_SCENARIO];
```

If a fifth mode is added, the chain silently picks up the new value in the
final `:` arm with no compiler error.

## ✅ Correct — extracted switch helper

```tsx
function scenariosFor(mode: DateFilterMode): Scenario[] {
  switch (mode) {
    case "intersect": return INTERSECT_SCENARIOS;
    case "include":   return [INCLUDE_SCENARIO];
    case "start":     return [START_SCENARIO];
    case "end":       return [END_SCENARIO];
  }
}
```

When a new variant is added to `DateFilterMode`, the switch fails to
type-check until the new `case` is added.

## ✅ Also correct — inline IIFE in a render position

When the dispatch result is rendered (not bound to a name), use the inline
IIFE pattern:

```tsx
<div>
  {(() => {
    switch (status) {
      case "loading":  return <Skeleton />;
      case "error":    return <ErrorPanel />;
      case "ready":    return <Content />;
    }
  })()}
</div>
```

## When two cases share an output

Group with stacked `case` labels — still exhaustive, still readable:

```tsx
switch (mode) {
  case "start":
  case "end": {
    const bound = mode === "start" ? task.start_date : task.end_date;
    // …
    return …;
  }
  case "intersect": return …;
  case "include":   return …;
}
```

## When a binary `?` is fine

A single `cond ? a : b` for a boolean toggle is allowed — the rule kicks in at
the SECOND `?` (any nested ternary). If you're about to add the second `?`,
extract a `switch`.

## Single-variant registries: accept the targeted eslint-disable up front

When the discriminated union has exactly **one** variant today but the switch is the registry shape for a growing list (notification rules, event handlers, message kinds, …), `@typescript-eslint/no-unnecessary-condition` flags the `case` literal because the comparison is trivially true. Three "fixes" that all fail:

- **`satisfies never` in a `default:` branch** — TS errors on the line: with a single-element union, the case-handled discriminant doesn't narrow `payload` to `never` in the way you'd expect; the default branch still sees the only variant's full type.
- **Restructure to `if (kind === "X") return …`** — still trips `no-unnecessary-condition`, AND violates this same heading ("always use switch for discriminated unions").
- **Generic typed-map dispatch (`HANDLERS[payload.kind](payload, …)`)** — distributive index types over a union collapse function parameters to their intersection (often `never`), so the lookup doesn't type-check at the call site without a cast.

Just put a targeted disable on the `case` line and a one-line comment that it'll resolve when a second variant lands:

```typescript
// ✅ Correct — registry designed to grow; disable resolves on second variant
switch (payload.kind) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  case "task_assigned": {
    // …
    return { send: true, message: { /* … */ } };
  }
}
```

The targeted disable is honest about the architectural shape; the architecture (one switch per discriminant) is correct per the heading above; the second rule landing erases both the disable and this whole concern.
