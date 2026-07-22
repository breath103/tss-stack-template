# Don't wrap `api.fetch` with thin "rename" helpers

`api.fetch` is already typed and ergonomic. Wrapping it in a same-shape helper just to give it a nicer name buys nothing and costs a layer of indirection. Readers chase the wrapper, maintainers re-duplicate type annotations, and the actual endpoint gets hidden from the callsite.

A wrapper is worth it **only** when it does one of:

- Adds domain-level defaults that matter at every call
- Validates / narrows the response beyond what the route's return type gives
- Combines multiple `api.fetch` calls into one logical operation
- Provides caching / retry / deduplication

If it doesn't, inline `api.fetch` at the callsite.

```typescript
// ❌ Wrong — pure rename, no value added
export async function listMemories(params?: { limit?: number; before?: string }): Promise<Memory[]> {
  return api.fetch("/api/memories", "GET", {
    query: { limit: params?.limit, before: params?.before },
  });
}
```

```typescript
// ✅ Correct — callsite reads the URL and method directly
const data = await api.fetch("/api/memories", "GET", {
  query: { limit: 50, before: cursor },
});
```
