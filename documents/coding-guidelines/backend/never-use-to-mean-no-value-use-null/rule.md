# Never use `""` to mean "no value" — use `null`

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
