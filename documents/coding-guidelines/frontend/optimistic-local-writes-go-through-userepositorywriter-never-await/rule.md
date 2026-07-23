---
requires: entity-repository
---

# Optimistic local writes go through `useRepositoryWriter` — never `await remote(); repository.set()`

Any mutation that updates or deletes an entity the UI is already showing, and that you have **no reason to expect will fail validation** (a date drag, an inline title/status/progress edit, a reorder, a toggle), MUST apply optimistically through the shared `repositoryWriter` (`@/contexts/RepositoryContext` — see `declare-one-shared-repositorywriter-build-once-import-everywhere`). Do **not** hand-roll `const updated = await api.fetch(...); repository.set(updated)` — that awaits the server round-trip before the cache moves, so the UI snaps back to the old value until the response lands (a dragged Gantt bar springs back, a typed title flickers).

`writer.enqueueUpdate` / `enqueueDelete` patch the local cache **first**, then fire `remote()`, roll the cache back on failure, and serialize per-entity writes through a FIFO queue. The realtime echo reconciles the authoritative row a beat later (deduped by deep-equal), so server-derived fields (rollups, computed columns) still settle correctly.

```ts
// ✅ Correct — optimistic: cache patched first, rollback on failure
class ObjectiveMutations {
  constructor(private readonly writer: typeof repositoryWriter) {}
  patch(id: string, updates: { start_date?: string | null; end_date?: string | null }): void {
    this.writer.enqueueUpdate("objectives", { id }, {
      local: (prev) => ({ ...prev, ...updates }),
      remote: async () => { await api.fetch("/api/objectives/:id", "PATCH", { params: { id }, body: updates }); },
    });
  }
}
export function useObjectiveMutations() {
  return useMemo(() => new ObjectiveMutations(repositoryWriter), []);
}
```

```ts
// ❌ Wrong — awaits the server before the cache moves; the edit visibly snaps back
async patch(id: string, updates: …) {
  const updated = await api.fetch("/api/objectives/:id", "PATCH", { params: { id }, body: updates });
  repository.set("objectives", updated); // too late — UI already rendered the stale value for a full round-trip
}
```

**The carve-out — inserts and expected-failure writes.** Inserts stay non-optimistic (`enqueueInsert` patches *after* the server assigns the id — you can't optimistically mint a server id). And a write you genuinely expect to bounce on validation (a uniqueness check, a server-side rule the client can't fully pre-check) should await the result so the user sees the real error instead of a value that appears then vanishes. Optimism is for writes you're confident will succeed — which is the overwhelming majority of edits to already-loaded rows.

## Showing loading? Await the writer's returned promise

Whether to show loading is a per-action decision. A **silent inline edit** (the optimistic case above — a drag, a toggle, a typed title) shows no spinner: fire the writer and move on. But a **critical, user-awaited action — create, delete, an explicit Save behind a confirm button — usually SHOULD show loading**, and that is exactly what the writer's return value is for. `enqueueUpdate` / `enqueueDelete` / `enqueueInsert` each return a `Promise` that resolves once `remote()` lands and rejects (after rollback) on failure. Wrap it in `useMutation` (see `use-usemutation-for-async-actions`) so the button gets `loading` / disabled / error for free.

This is **not** the banned `await api.fetch(); repository.set()` — the cache already moved optimistically (or, for an insert, is seeded when the promise resolves), so nothing snaps back; you await *only* to drive the spinner. Requires `entity-repository` ≥ 0.5.0 — the version where `enqueueUpdate` / `enqueueDelete` return a promise (before that only `enqueueInsert` did). **Current version: 0.5.0.**

```ts
// ✅ Correct — critical action: optimistic delete + the awaited promise drives loading
const del = useMutation(
  () =>
    repositoryWriter.enqueueDelete("objectives", { id }, {
      remote: async () => { await api.fetch("/api/objectives/:id", "DELETE", { params: { id } }); },
    }),
  [id],
);
<Button text="Delete" loading={del.status === "loading"} onClick={() => void del.call()} />
```

```ts
// ❌ Wrong — fire-and-forget on a confirm button: no spinner, so the user re-clicks and double-deletes
<Button text="Delete" onClick={() => void repositoryWriter.enqueueDelete("objectives", { id }, { remote })} />
```