# No warnings — treat ESLint warnings as errors

ESLint warnings must be fixed, not ignored. A clean lint run means zero errors AND zero warnings.

```typescript
// ✅ Correct - return Promise directly instead of async with no await
function listMemories(): Promise<Memory[]> {
  return api.fetch("/api/memories", "GET");
}
```

```typescript
// ❌ Wrong - async with no await triggers require-await warning
async function listMemories(): Promise<Memory[]> {
  return api.fetch("/api/memories", "GET");
}
```
