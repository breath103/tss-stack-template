---
topic: Types and schemas
order: 10
---

# When a value has a zod schema, derive its type with z.infer; don't hand-write a second type.

When a value has a zod schema (it is validated at an HTTP/RPC boundary, persisted as jsonb, or
otherwise comes from outside the type system), the schema is the only definition. Derive the
TypeScript type with `z.infer`. A hand-written `interface` for the same shape drifts, and the
drift surfaces when production crashes on a field the validator accepts but the type doesn't.

The schema and its type ship from one module, named after the value, and every consumer imports
both from there:

```typescript
// ✅ modules/db/src/workspace-settings.ts
export const workspaceSettingsSchema = z.object({
  system_prompt: z.string().max(20_000).nullable(),
});
export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

// a route validates with the schema
route("/api/workspaces/:workspaceId", "PATCH", {
  body: { settings: workspaceSettingsSchema },
  handler: /* … */,
});

// the repository, the jsonb column overlay and the frontend annotate with the type
import type { WorkspaceSettings } from "@modules/db";
```

```typescript
// ❌ the same shape twice: an interface in a types file, a schema in the route
export interface WorkspaceSettings {
  system_prompt: string | null;
}

const workspaceSettingsSchema = z.object({
  system_prompt: z.string().max(20_000).nullable(),
});
```

The ❌ form looks tidy (validation with the route, the type with other types), but the only thing
keeping the two in sync is whoever edits both. Add a field to one and forget the other, and
either the route strips it or the type carries a field the route rejects.

A tiny shape one route uses stays inline at the `route()` call
(`inline-single-use-schemas-and-variables`). Promote it to a named `xSchema` plus derived `X`
when a second consumer exists.

## A method that determines its result's shape

Keep that correlation as a shared discriminated union and emit the union from the producer.
Persist and transport the same schema-derived value; do not store a weaker legacy shape and use a
zod transform to manufacture the domain model later. Do not degrade the pair to `method: string`
plus `result: unknown`, or rebuild its shape with frontend casts and property probes. Failure
conditions belong in the union's error branch, not as booleans on a success variant.

At an untrusted boundary, validating each union member is not enough: correlate related values
too. A tool response's discriminant must match the request method recorded for the same
tool-call id before persistence. When one side of the correlation comes from a trusted service,
keep the trusted value and compare the untrusted peer against it; checking that two
client-supplied values agree only proves the client fabricated them consistently.

## When zod is the wrong tool

Database row types come from the Kysely overlay (`Selectable<Database["<table>"]>`), not zod.
Use zod for what crosses an untyped boundary: request bodies, jsonb columns whose shape is
app-defined, queue payloads, third-party API responses.
