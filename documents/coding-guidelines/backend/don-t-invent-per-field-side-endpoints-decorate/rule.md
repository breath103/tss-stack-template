---
topic: API routes
order: 20
---

# When a page needs one derived value about an entity, add it to that entity's GET response; don't create an endpoint for it.

When a resource needs a derived value (a presigned URL, a joined name, a computed status), return it on the parent resource's GET response, not from a dedicated sidecar endpoint. The sidecar adds an endpoint to maintain, a second round trip, and a second permission check for the same entity.

```ts
// ✅ Correct — GET /api/tasks/:id returns the row plus its derived url.
route("/api/tasks/:id", "GET", {
  handler: async ({ params, c }) => {
    const task = await fetchTask(user.id, params.id);
    return { ...task, attachmentUrl: task.metadata.attachmentKey ? publicUrl(task.metadata.attachmentKey) : null };
  },
});
```

```ts
// ❌ Wrong — dedicated /attachment/download-url endpoint that re-fetches the same task just to return one derived field.
route("/api/tasks/:id/attachment/download-url", "GET", { handler: async ... });
```

Exception: derivation is expensive (multi-second), OR the caller is likely to want the parent *without* the derived value most of the time. Then a separate endpoint earns its keep.
