# Don't invent per-field side-endpoints; decorate the parent resource

When a resource needs a derived value (a presigned URL, a joined name, a computed status), return it on the parent resource's GET response, not from a dedicated sidecar endpoint. The sidecar adds an endpoint to maintain, a second round trip, and a second permission check for the same entity.

```ts
// ✅ Correct — GET /api/memories/:id returns the row plus its derived url.
route("/api/memories/:id", "GET", {
  handler: async ({ params, c }) => {
    const memory = await fetchMemory(user.id, params.id);
    return { ...memory, audioUrl: memory.metadata.audioKey ? publicUrl(memory.metadata.audioKey) : null };
  },
});
```

```ts
// ❌ Wrong — dedicated /audio/play-url endpoint that re-fetches the same memory just to return one derived field.
route("/api/memories/:id/audio/play-url", "GET", { handler: async ... });
```

Exception: derivation is expensive (multi-second), OR the caller is likely to want the parent *without* the derived value most of the time. Then a separate endpoint earns its keep.
