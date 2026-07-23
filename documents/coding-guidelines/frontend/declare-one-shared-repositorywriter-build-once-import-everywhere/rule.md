---
requires: entity-repository
---

# Declare one shared `repositoryWriter` — build it once, import it everywhere

There is **exactly one** `RepositoryWriter` per app. Build it once on the
singleton `repository` and export the instance from the repository context;
every consumer imports *that instance*. Do **not** `new RepositoryWriter(...)`
at call sites, and do **not** wrap it in a per-component hook that news one up
on every call.

```ts
// ✅ Correct — one instance, declared where the repository lives
// contexts/RepositoryContext.ts
import { createRepositoryContext, RepositoryWriter } from "entity-repository";

const { repository, /* … */ } = createRepositoryContext<Entities, typeof entityConfig>({
  entities: entityConfig,
});
export { repository };
export const repositoryWriter = new RepositoryWriter(repository);
```

```ts
// ✅ Correct — consumers import the shared instance
import { repositoryWriter } from "@/contexts/RepositoryContext";

repositoryWriter.enqueueUpdate("tasks", { id }, { local, remote });
```

```ts
// ❌ Wrong — a per-call hook mints a fresh writer for every component
export function useRepositoryWriter() {
  const repository = useRepository();
  return useMemo(() => new RepositoryWriter(repository), [repository]); // N writers, one repository
}
```

## Why one instance

- **The `repository` is already a singleton**, so every writer wraps the *same*
  object. The moment there is more than one writer, the per-entity FIFO queues
  and the `beforeunload` guard have to become module-global just to serialize
  correctly across the redundant instances — global mutable state that only
  exists to paper over the duplication. Collapse to one writer and that state
  goes back to being plain instance fields.
- **The writer's job is cross-cutting coordination**, and coordination only
  works when everyone shares it:
  - *Optimistic writes* — `enqueueUpdate` / `enqueueDelete` patch the cache
    first, then run `remote()`, rolling back on failure (see
    `optimistic-local-writes-go-through-userepositorywriter-never-await`).
  - *Per-entity FIFO ordering* — two rapid edits to the same row must reach the
    server in order; that guarantee holds only if both edits go through the
    same queue, i.e. the same instance.
  - *One `beforeunload` guard* — the writer blocks tab close while any queue
    still has pending work. That is a single page-level concern; N writers with
    N guards is nonsense.
- **`enqueueInsert` is non-optimistic** — it seeds the cache from the server's
  response (you can't optimistically mint a server id), so the originating
  client doesn't wait on a realtime echo to see the new row.

## Injecting it into mutation classes

Mutation classes (see `context-mutations-one-class-instance-via-a-single`)
take the writer by constructor injection so they stay testable. Type the
parameter `typeof repositoryWriter` — there is one writer with one generic
instantiation for the whole app, so referencing the instance's type is exact
and DRY. Do **not** re-spell `RepositoryWriter<Entities, typeof entityConfig>`
by hand (wasteful — it just restates what `typeof repositoryWriter` already
is), and never use the **bare** `RepositoryWriter`, which erases the entity
generics so table names stop being type-checked and `local: (prev) => …`
degrades `prev` to `Record<string, unknown>` instead of the real row type.

```ts
class ObjectiveMutations {
  constructor(private readonly writer: typeof repositoryWriter) {}
  patch(id: string, updates: { start_date?: string | null }): void {
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
