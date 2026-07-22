# Derive types from zod schemas — never maintain them in parallel

When a value has a zod schema (because it's validated at an HTTP/RPC boundary,
or persisted as jsonb, or otherwise comes from outside the type system), the
schema is the single source of truth. Derive the TypeScript type from it via
`z.infer`. Never hand-write a parallel `interface` / `type` for the same shape
— the two will drift, and the drift only surfaces when production crashes on a
field the runtime validator accepts but the type doesn't (or vice versa).

This is the codebase-wide convention already followed in
`packages/backend/src/types/*.ts` (`task-filter.ts`, `task-history.ts`,
`comment.ts`, `task-relation.ts`, `work-state.ts`, `task-filters.ts`,
`tasks-view.ts`, …): each file colocates the schema and the inferred type, and
every consumer imports the schema (for validation) and the type (for
annotations) from that single file.

```typescript
// ✅ Correct — schema is the source of truth; type is derived
// packages/backend/src/types/tasks-view.ts
import { z } from "zod";
import { filterClauseSchema } from "./task-filter.js";

export const tasksViewStateSchema = z.object({
  filter: z.array(filterClauseSchema),
  dimension1: z.enum(["project", "objective", "pic", "sv"]).nullable(),
  /* …more fields… */
});
export type TasksViewState = z.infer<typeof tasksViewStateSchema>;

// packages/backend/src/routes/tasks-views.ts
import { tasksViewStateSchema } from "../types/tasks-view.js";
route(/* … */, { body: { state: tasksViewStateSchema }, handler: /* … */ });

// packages/backend/src/lib/tasks-views.ts (and frontend, via @backend/types)
import type { TasksViewState } from "../types/tasks-view.js";
```

```typescript
// ❌ Wrong — schema in the route, hand-written interface in the type file
// packages/backend/src/types/tasks-view.ts
export interface TasksViewState {
  filter: Filter;
  dimension1: "project" | "objective" | "pic" | "sv" | null;
  /* …copy of the schema, by hand… */
}

// packages/backend/src/routes/tasks-views.ts
const tasksViewStateSchema = z.object({
  filter: z.array(filterClauseSchema),
  dimension1: z.enum(["project", "objective", "pic", "sv"]).nullable(),
  /* …same shape, written again… */
});
```

The two-file pattern above is the trap: it looks neat (validation lives with
the route; the type lives with other types), but the two definitions ARE the
same shape — and the only thing keeping them in sync is the human who edits
them both whenever the shape changes. Add a field to one, forget the other, and
either the route silently strips it or `z.infer` carries a field the route
rejects. Both fail silently until production.

## Where the schema file lives

Per-table jsonb columns and per-route payloads both belong in
`packages/backend/src/types/`. Name the file after the value
(`tasks-view.ts`, not `tasks-views-route.ts`) so imports read naturally —
`import { tasksViewStateSchema, type TasksViewState } from
"../types/tasks-view.js"`. The schema and the derived type ship from the same
module; that's the whole point.

If a single route uses a tiny one-off shape, the `inline-single-use-schemas-and-variables`
rule still wins — declare the schema inline at the route call:

```typescript
route("/api/search", "POST", {
  body: { q: z.string(), limit: z.number().optional() },  // inline
  handler: /* … */,
});
```

Promote to a named `xSchema` (and derived `X`) the moment a second consumer
exists (frontend type imports, another route, a repo, a test fixture).

## When zod is the wrong tool

Database row types come straight from generated codegen — use
`Database["public"]["Tables"]["X"]["Row"]` (see
`use-database-row-types-no-manual-interfaces`), not zod. Use zod for what
crosses an untyped boundary: request bodies, jsonb columns whose shape is
app-defined, message-queue payloads, third-party API responses.
