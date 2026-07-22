# Never force-cast API client responses

`api.fetch()` returns fully typed responses. If you're using `as unknown as` to cast the result, you're hiding a type mismatch — fix the type, don't cast it away.

```typescript
// ✅ Correct - use the return type directly
function listMemories() {
  return api.fetch("/api/memories", "GET");
}
```

```typescript
// ❌ Wrong - force casting hides a real type mismatch
function listMemories(): Promise<Memory[]> {
  return api.fetch("/api/memories", "GET") as unknown as Promise<Memory[]>;
}
```
