---
topic: Code structure
order: 30
---

# When a schema or variable is used once, inline it where it is used.

Don't extract a variable for something used only once. Inline it.

```typescript
// ✅ Correct - inline the schema
route("/api/tasks/search", "POST", {
  body: {
    q: z.string(),
    limit: z.number().optional(),
  },
  handler: ...,
});
```

```typescript
// ❌ Wrong - extracted variable used once
const searchBody = {
  q: z.string(),
  limit: z.number().optional(),
};

route("/api/tasks/search", "POST", {
  body: searchBody,
  handler: ...,
});
```
