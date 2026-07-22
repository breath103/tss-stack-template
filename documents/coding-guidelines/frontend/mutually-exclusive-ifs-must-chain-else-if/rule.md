# Mutually exclusive `if` blocks must chain with `else if` — and end with an explicit `else`

A sequence of independent `if` blocks testing the **same discriminant** reads as if
each test could fall through into the next — the reader has to verify every block
`return`s to discover they're actually exclusive. Chaining with `else if` encodes the
exclusivity structurally, and a terminal `else` makes the fallback a deliberate branch
instead of dead-looking code after the stack.

If the discriminant is a string-literal union, this rule doesn't apply — use `switch`
(see `frontend/always-use-switch-for-discriminated-unions`). This rule is for open
discriminants (`event.key`, arbitrary strings) where exhaustiveness checking buys nothing.

Guard clauses are NOT this pattern: early returns testing *different* conditions
(`if (!el) return; if (loading) return;`) stay as flat guards.

```tsx
// ❌ Wrong — parallel ifs on one discriminant; exclusivity only visible by
// auditing every block for a return, fallback dangles at the bottom
if (key === "ArrowDown") { ...; return true; }
if (key === "ArrowRight") { ...; return true; }
if (key === "Enter") { ...; return true; }
return false;
```

```tsx
// ✅ Correct — else-if chain states the exclusivity; the fallback is a branch
if (key === "ArrowDown") {
  ...
  return true;
} else if (key === "ArrowRight") {
  ...
  return true;
} else if (key === "Enter") {
  ...
  return true;
} else {
  return false;
}
```
