---
requires: entity-repository
topic: API routes
order: 30
---

# When a page needs a count or sum of child rows, serve it from a sidecar endpoint; don't add a field to the parent row.

When a derived value is an **aggregate over a child collection** (task count per project, comment count per thread, attachment count per task), it does NOT belong on the parent entity's row. The frontend's `useRepositoryListQuery` / `useRepositoryQuery` are typed against the DB row shape — adding `comment_count: number` to the parent either pollutes the entity type with non-row fields (every consumer now sees them, including the realtime upsert path that has no way to compute them), or gets stripped at the repository boundary and silently lost.

Aggregates fan out and change with the children. They aren't a property of the parent row; they're a derived view. Put them in a sidecar endpoint named `/api/<parents>/counts` (or `/api/<parents>/:id/stats`), and have the frontend refetch on child-table repository events with a debounce.

```ts
// ✅ Correct — counts in a sidecar, parent stays a clean entity stream
route("/api/threads", "GET", {
  handler: async ({ c }) => threadsRepo.list(c.get("requireUser")().id), // returns Thread[]
});

route("/api/threads/counts", "GET", {
  handler: async ({ c }) => threadsRepo.commentCounts(c.get("requireUser")().id),
  // returns [{ thread_id, comment_count }]
});
```

```ts
// ❌ Wrong — returns ThreadWithCounts; frontend's useRepositoryListQuery
// either widens the entity type to include count fields (which the realtime
// upsert can't supply), or strips them silently.
route("/api/threads", "GET", {
  handler: async ({ c }) => threadsRepoWithCounts.list(...),
});
```

How to tell which rule applies:
- **Single derived field about the entity itself** (URL, computed status, joined name) → put on the parent's GET response.
- **Aggregate that scales with a child collection** (counts, sums, latest-of) → sidecar endpoint, refetch on child repo events.