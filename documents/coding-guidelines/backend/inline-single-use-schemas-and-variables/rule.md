# Inline single-use schemas and variables

Don't extract a variable for something used only once. Inline it.

```typescript
// ✅ Correct - inline the schema
route("/api/memories/search", "POST", {
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

route("/api/memories/search", "POST", {
  body: searchBody,
  handler: ...,
});
```
