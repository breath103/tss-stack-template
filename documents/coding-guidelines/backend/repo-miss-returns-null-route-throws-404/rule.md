---
topic: Repositories and services
order: 20
---

# When a repo method reads, updates or deletes a row that may not exist, return null; the route turns null into a 404 with requireOrThrow.

Not-found returns `T | null` (or `boolean` for existence checks). The route layer translates null → HTTP status via the `requireOrThrow` helper in `lib/require-or-throw.js`.

**`null` has one meaning per method, and on a read or an update that meaning is "no such row".** Pick the return type by counting the ways the method can fail:

| The method | Returns | The route |
|---|---|---|
| read, update or delete by id | `T \| null` — `null` = no such row. `executeTakeFirst()`, never `executeTakeFirstOrThrow()` | `requireOrThrow(…, notFound)` |
| insert guarded by a unique index | `T \| null` — an insert cannot miss, so `null` = the index rejected it | `requireOrThrow(…, taken)` |
| update that can miss **and** hit a unique index | `Result` with a code for each: `backend/repo-update-miss-and-conflict-returns-result` | `.throwOr(…)` |

The error factory passed to `requireOrThrow` is lazy — the `new HTTPException` cost only happens on the miss path. Hoist it to a module-level `const` per resource so every callsite reuses the same message.

```ts
// ✅ Correct — repo returns nullable, route narrows
// tasks-repository.ts
async getById(userId: string, id: string): Promise<Task | null> {
  const { data } = await serviceClient.get()...maybeSingle().throwOnError();
  return data;
}

// routes/task.ts
const notFound = () => new HTTPException(404, { message: "Task not found" });

route("/api/tasks/:id", "GET", {
  handler: async ({ params, c }) => {
    const user = c.get("requireUser")();
    return requireOrThrow(await tasksRepo.getById(user.id, params.id), notFound);
  },
});
```

```ts
// ❌ Wrong — repo throws HTTPException, couples data layer to HTTP
async getById(userId: string, id: string): Promise<Task> {
  const { data } = await serviceClient.get()...maybeSingle().throwOnError();
  if (!data) throw new HTTPException(404, { message: "Task not found" });
  return data;
}
```
