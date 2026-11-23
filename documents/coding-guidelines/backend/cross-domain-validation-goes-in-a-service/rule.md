---
topic: Repositories and services
order: 80
---

# When validation reads another domain's data or runs at two or more entry points, put it in a Service that returns Result; routes only translate the failure.

When a write operation needs to validate against another domain (e.g. memory writes verify that referenced entity ids exist in the user's ontology), the validation **does not** belong inline at every boundary. Two boundaries today (HTTP route + agent skill handler), more tomorrow (CLI worker, cron job, gRPC) — each one copy-pasting the check is the kind of repetition that grows new bugs every time a new boundary lands.

Instead, define a **Service class** in the domain's directory next to the repo. The service:

- Composes the repos it needs (cross-domain dependencies are explicit constructor params).
- Performs the cross-cutting validation.
- Returns `Result<Success, Failure>` (see `lib/result.ts`) — never throws for known failure modes.

The boundaries (route, skill handler, …) become thin: call the service and `result.throwOr(f => ...)` to translate the failure variant to the boundary's own error shape (HTTPException for routes, plain Error for agent handlers, exit code for CLIs). Adding a new variant in the service becomes a compile error at every `throwOr` callback that doesn't yet handle it — exactly the safety net the inline-validation pattern lacks.

```ts
// ✅ Correct — service composes repos, returns typed Result
// memories/memories-service.ts
type CreateError = { code: "unknown_entity_refs"; missing: string[] };
type UpdateError = CreateError | { code: "not_found"; id: string };

export class MemoryService {
  constructor(
    private readonly entities: EntitiesRepository,
    private readonly memories: MemoriesRepository,
  ) {}

  async create(userId: string, input: MemoryWriteInput): Promise<Result<Memory, CreateError>> {
    const missing = await this.entities.findMissing(userId, collectEntityRefs(input.metadata));
    if (missing.length > 0) return Result.failure({ code: "unknown_entity_refs", missing });
    return Result.success(await this.memories.create(userId, input));
  }
}

export const memoryService = new MemoryService(entitiesRepo, memoriesRepo);

// routes/memory.ts — boundary translates Result.failure → HTTPException via throwOr
route("/api/memories", "POST", {
  body: memoryWriteInputSchema,
  handler: async ({ body, c }) => {
    const user = c.get("requireUser")();
    return (await memoryService.create(user.id, body))
      .throwOr((f) => unknownEntityRefs(f.missing));
  },
});

// skill-runtimes/memory.ts — same service, different boundary translation
createMemory: m({
  params: memoryWriteInputSchema,
  returns: memorySchema,
  handler: async (ctx, params) => {
    return (await memoryService.create(ctx.userId, params))
      .throwOr((f) => unknownEntityRefs(f.missing));
  },
}),

// routes/memory.ts — multi-variant uses an exhaustive switch inside throwOr
route("/api/memories/:id", "PATCH", {
  body: memoryPatchSchema,
  handler: async ({ params, body, c }) => {
    const user = c.get("requireUser")();
    return (await memoryService.update(user.id, params.id, body))
      .throwOr((f) => {
        switch (f.code) {
          case "unknown_entity_refs": return unknownEntityRefs(f.missing);
          case "not_found":           return notFound();
        }
      });
  },
});
```

```ts
// ❌ Wrong — validation duplicated at every boundary. Adding a third boundary
// (CLI, cron) means a third copy of the same `if (!await ownsAll(...)) throw ...`
// block. A new error variant changes nothing at the type level — every old
// boundary keeps compiling and silently misses the new case.
route("/api/memories", "POST", {
  handler: async ({ body, c }) => {
    const user = c.get("requireUser")();
    if (!await entitiesRepo.ownsAll(user.id, collectEntityRefs(body.metadata))) {
      throw new HTTPException(422, { message: "..." });
    }
    return await memoriesRepo.create(user.id, body);
  },
});
```

### When to introduce a service vs. when not to

Introduce a service when:

- The write needs to **read from another domain's repo** before persisting (e.g. memory writes consult the ontology).
- The same validation runs at **two or more boundaries** (HTTP + agent skill, etc).
- There are **multiple typed failure modes** the boundary needs to distinguish.

Skip the service (call the repo directly) when:

- The write only touches its own domain.
- The boundary is one place.
- The only failure mode is "row missing on update" — that's what `T | null` + `requireOrThrow` is for.
- The failure modes are "row missing" and "unique index rejected it" on one single-table update — the repo method returns the `Result` itself (`backend/repo-update-miss-and-conflict-returns-result`).

### `Result<T, E>` shape

Union of two classes, each carrying the value field that names its variant — `Success<T>.success: T` and `Failure<E>.failure: E`:

```ts
// lib/result.ts
class Success<T> { constructor(readonly success: T) {} throwOr(...): T }
class Failure<E> { constructor(readonly failure: E) {} throwOr(...): never }
type  Result<T, E> = Success<T> | Failure<E>;
const Result = { success: (v) => new Success(v), failure: (e) => new Failure(e) };
```

Construct via the `Result.success` / `Result.failure` factories — they produce instances with the `throwOr` method attached, which the boundary uses to translate-or-pass-through:

```ts
// service
return Result.success(row);
return Result.failure({ code: "not_found", id });

// boundary — preferred form for translate-or-pass-through
return result.throwOr((f) => unknownEntityRefs(f.missing));

// boundary — multi-variant translation, exhaustive switch inside the callback
return result.throwOr((f) => {
  switch (f.code) {
    case "unknown_entity_refs": return unknownEntityRefs(f.missing);
    case "not_found":           return notFound(f.id);
  }
});
```

When a boundary needs to *branch* on success/failure (not just translate), narrow with the `in` operator — TS narrows the union by exclusive property presence:

```ts
if ("success" in result) {
  // result: Success<T>; access result.success
} else {
  // result: Failure<E>; access result.failure.code
}
```

Variant discriminator is **which key is present** (`success` vs `failure`), not a boolean tag — no `ok: boolean` field, no named-`value`-vs-named-`error` confusion.

Failure values are themselves discriminated unions: `{ code: "unknown_entity_refs"; missing: string[] } | { code: "not_found"; id: string }`. The `code` literal is the discriminant inside the failure variant; the boundary's `throwOr` callback (or `switch`) handles each case exhaustively.
