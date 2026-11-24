---
topic: Repositories and services
order: 80
---

# When validation reads another domain's data or runs at two or more entry points, put it in a Service that returns Result; routes only translate the failure.

When a write operation needs to validate against another domain (e.g. task writes verify that the assignee ids are members of the project), the validation **does not** belong inline at every boundary. Two boundaries today (HTTP route + background job handler), more tomorrow (CLI, cron job, gRPC) — each one copy-pasting the check is the kind of repetition that grows new bugs every time a new boundary lands.

Instead, define a **Service class** in the domain's directory next to the repo. The service:

- Composes the repos it needs (cross-domain dependencies are explicit constructor params).
- Performs the cross-cutting validation.
- Returns `Result<Success, Failure>` (see `lib/result.ts`) — never throws for known failure modes.

The boundaries (route, job handler, …) become thin: call the service and `result.throwOr(f => ...)` to translate the failure variant to the boundary's own error shape (HTTPException for routes, plain Error for job handlers, exit code for CLIs). Adding a new variant in the service becomes a compile error at every `throwOr` callback that doesn't yet handle it — exactly the safety net the inline-validation pattern lacks.

```ts
// ✅ Correct — service composes repos, returns typed Result
// tasks/tasks-service.ts
type CreateError = { code: "unknown_assignees"; missing: string[] };
type UpdateError = CreateError | { code: "not_found"; id: string };

export class TaskService {
  constructor(
    private readonly members: ProjectMembersRepository,
    private readonly tasks: TasksRepository,
  ) {}

  async create(projectId: string, input: TaskWriteInput): Promise<Result<Task, CreateError>> {
    const missing = await this.members.findMissing(projectId, input.assignee_ids);
    if (missing.length > 0) return Result.failure({ code: "unknown_assignees", missing });
    return Result.success(await this.tasks.create(projectId, input));
  }
}

export const taskService = new TaskService(projectMembersRepo, tasksRepo);

// routes/tasks.ts — boundary translates Result.failure → HTTPException via throwOr
route("/api/projects/:projectId/tasks", "POST", {
  body: taskWriteInputSchema,
  handler: async ({ body, c }) => {
    const project = c.get("requireProject")();
    return (await taskService.create(project.id, body))
      .throwOr((f) => unknownAssignees(f.missing));
  },
});

// jobs/import-tasks.ts — same service, different boundary translation
export async function handleImportTaskJob(job: ImportTaskJob): Promise<Task> {
  return (await taskService.create(job.projectId, job.input))
    .throwOr((f) => new Error(`unknown assignees: ${f.missing.join(", ")}`));
}

// routes/tasks.ts — multi-variant uses an exhaustive switch inside throwOr
route("/api/projects/:projectId/tasks/:id", "PATCH", {
  body: taskPatchSchema,
  handler: async ({ params, body, c }) => {
    const project = c.get("requireProject")();
    return (await taskService.update(project.id, params.id, body))
      .throwOr((f) => {
        switch (f.code) {
          case "unknown_assignees": return unknownAssignees(f.missing);
          case "not_found":         return notFound();
        }
      });
  },
});
```

```ts
// ❌ Wrong — validation duplicated at every boundary. Adding a third boundary
// (CLI, cron) means a third copy of the same `if (!await containsAll(...)) throw ...`
// block. A new error variant changes nothing at the type level — every old
// boundary keeps compiling and silently misses the new case.
route("/api/projects/:projectId/tasks", "POST", {
  handler: async ({ body, c }) => {
    const project = c.get("requireProject")();
    if (!await projectMembersRepo.containsAll(project.id, body.assignee_ids)) {
      throw new HTTPException(422, { message: "..." });
    }
    return await tasksRepo.create(project.id, body);
  },
});
```

### When to introduce a service vs. when not to

Introduce a service when:

- The write needs to **read from another domain's repo** before persisting (e.g. task writes consult project membership).
- The same validation runs at **two or more boundaries** (HTTP + background job, etc).
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
return result.throwOr((f) => unknownAssignees(f.missing));

// boundary — multi-variant translation, exhaustive switch inside the callback
return result.throwOr((f) => {
  switch (f.code) {
    case "unknown_assignees": return unknownAssignees(f.missing);
    case "not_found":         return notFound(f.id);
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

Failure values are themselves discriminated unions: `{ code: "unknown_assignees"; missing: string[] } | { code: "not_found"; id: string }`. The `code` literal is the discriminant inside the failure variant; the boundary's `throwOr` callback (or `switch`) handles each case exhaustively.
