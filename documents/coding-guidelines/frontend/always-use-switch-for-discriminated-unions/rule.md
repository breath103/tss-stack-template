# Always use switch for discriminated unions (and any string-literal mode union)

When handling a discriminated union OR any string-literal union (a `mode`, a
`kind`, a `view`, etc.), always use a `switch` statement on the discriminant.
Never use a nested ternary, and never use `if`/`else if` chains. `switch`
preserves exhaustiveness checking — the compiler catches missing cases — and
the resulting code reads top-to-bottom instead of folding back on itself.

This rule applies on the frontend exactly as it does on the backend
(`backend/always-use-switch-for-discriminated-unions/rule.md`). The frontend
breaks it more often because JSX inline-expression positions tempt you into
"clever" nested ternaries that other readers have to mentally unfold.

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
IIFE pattern (see `frontend/multi-branch-render-inline-iife-with-if-else`):

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
