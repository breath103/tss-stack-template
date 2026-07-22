---
requires: entity-repository
---

# Aggregates over a child table go in a sidecar — never on the entity row

When a derived value is an **aggregate over a child collection** (event count per radar, message count per chat, fragment count per memory), it does NOT belong on the parent entity's row. The frontend's `useRepositoryListQuery` / `useRepositoryQuery` are typed against the DB row shape — adding `event_count: number` to the parent either pollutes the entity type with non-row fields (every consumer now sees them, including the realtime upsert path that has no way to compute them), or gets stripped at the repository boundary and silently lost.

Aggregates fan out and change with the children. They aren't a property of the parent row; they're a derived view. Put them in a sidecar endpoint named `/api/<parents>/counts` (or `/api/<parents>/:id/stats`), and have the frontend refetch on child-table repository events with a debounce.

```ts
// ✅ Correct — counts in a sidecar, parent stays a clean entity stream
route("/api/memories", "GET", {
  handler: async ({ c }) => memoriesRepo.list(c.get("requireUser")().id), // returns Memory[]
});

route("/api/memories/counts", "GET", {
  handler: async ({ c }) => memoriesRepo.fragmentCounts(c.get("requireUser")().id),
  // returns [{ memory_id, fragment_count }]
});
```

```ts
// ❌ Wrong — returns MemoryWithCounts; frontend's useRepositoryListQuery
// either widens the entity type to include count fields (which the realtime
// upsert can't supply), or strips them silently.
route("/api/memories", "GET", {
  handler: async ({ c }) => memoriesRepoWithCounts.list(...),
});
```

How to tell which rule applies:
- **Single derived field about the entity itself** (URL, computed status, joined name) → put on the parent's GET response.
- **Aggregate that scales with a child collection** (counts, sums, latest-of) → sidecar endpoint, refetch on child repo events.