# Always use switch for discriminated unions

When handling a discriminated union, always use a `switch` statement on the discriminant. Never use `if`/`else if` chains. This ensures exhaustive handling — the compiler will catch missing cases.

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

### Single-variant registries: accept the targeted eslint-disable up front

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
