---
topic: Types and schemas
order: 50
---

# When a field can have no value, type it T | null; never "", -1 or a sentinel date.

The reflex this rule exists to kill: you hit a real state the current type can't
represent (a token with no expiry, a record with no parent, a metric not yet
measured), and instead of widening the field to admit that state, you manufacture
a value that satisfies the existing type — `""`, `Number.MAX_SAFE_INTEGER`, `-1`,
`0`, `Infinity`, a sentinel date like `9999-12-31`. That is not a smaller version
of the fix; it is a **bug you are planting** so you don't have to touch the schema
and its consumers. The placeholder reads as a real value everywhere downstream —
the arithmetic runs, the comparison passes, the "absent" case is invisible — until
it silently misbehaves in exactly the state you were papering over.

**Fix the underlying data model.** If the value can be absent, its type is
`T | null`; change it at the source (the zod schema / column / interface) and let
the type checker walk you to every consumer that must now handle `null`. Touching
those consumers is the work, not a cost to avoid — each `null` branch you're forced
to write is a place the sentinel would have silently done the wrong thing.

## `""` is the string version

Empty string is a legitimate value (a user cleared a text input, a field was explicitly blanked). `null` / `undefined` is the absence of a value. Conflating the two is a type lie: the signature claims "always a string," callers have to guess whether `""` means "really empty" or "missing," and bugs slip through compaction / truthiness checks.

```typescript
// ✅ Correct — null signals absence, "" signals "empty string value"
function metadataText(m: Metadata): string | null {
  switch (m.type) {
    case "call":     return m.counterpart.length > 0 ? m.counterpart.join(", ") : null;
    case "document": return m.source?.id ?? null;
  }
}
```

```typescript
// ❌ Wrong — returning "" to mean "no metadata"
function metadataText(m: Metadata): string {
  switch (m.type) {
    case "call":     return m.counterpart.join(", ");   // could be ""
    case "document": return m.source?.id ?? "";          // lies: missing ≠ empty
  }
}
```

Same rule applies to object fields, API responses, nullable columns: if a field is optional, type it as `T | null` and use `null` — not `T` with `""` as a sentinel.

## Numeric sentinels are the same lie

`Number.MAX_SAFE_INTEGER`, `-1`, `0`, `Infinity` are the numeric version — and the more tempting one, because a huge or tiny number "just works" in a comparison and hides the shortcut better than `""` does. Type the field `number | null` and branch on `null`.

```typescript
// ✅ Correct — null means "no expiry"; the timer check skips it explicitly
expiresAt: token.expires_in === undefined ? null : Date.now() + token.expires_in * 1000,
// consumer:
if (expiresAt !== null && Date.now() >= expiresAt - SKEW) await refresh();
```

```typescript
// ❌ Wrong — MAX_SAFE_INTEGER is a "never" sentinel; the check reads it as a real far-future expiry
expiresAt: token.expires_in === undefined ? Number.MAX_SAFE_INTEGER : Date.now() + token.expires_in * 1000,
if (Date.now() >= expiresAt - SKEW) await refresh();   // "works" only by accident of the magic number
```
