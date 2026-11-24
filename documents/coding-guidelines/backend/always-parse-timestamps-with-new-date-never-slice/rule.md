---
topic: Types and schemas
order: 100
---

# When you need a date part from a timestamp, parse it with new Date(); don't slice the string.

Never extract date parts by slicing a timestamp string. Always parse into a `Date` object first, then format.

```typescript
// ✅ Correct - parse then format
const day = new Date(row.created_at).toISOString().slice(0, 10);
```

```typescript
// ❌ Wrong - slicing a raw string assumes format
const day = row.created_at.slice(0, 10);
```
