# Never use `""` to mean "no value" — use `null`

Empty string is a legitimate value (a user cleared a text input, a field was explicitly blanked). `null` / `undefined` is the absence of a value. Conflating the two is a type lie.

```typescript
// ✅ Correct — null signals absence, "" signals "empty string value"
function sourceLabel(source: { id: string } | null): string | null {
  return source?.id ?? null;
}

<input value={title ?? ""} onChange={(e) => setTitle(e.target.value || null)} />
```

```typescript
// ❌ Wrong — returning "" to mean "no source"
function sourceLabel(source: { id: string } | null): string {
  return source?.id ?? "";   // lies: missing ≠ empty string
}
```
