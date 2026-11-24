---
topic: Repositories and services
order: 40
---

# When you write a repo method, keep HTTP out of it: no ApiError, no status code, no request-body schema; those belong to the route.

Repo methods never throw `HTTPException`. This keeps repos reusable from non-HTTP contexts (CLI, worker, gRPC) without importing `hono` or translating exceptions at every call. What a repo returns for a missing row is `backend/repo-miss-returns-null-route-throws-404`.

Ownership / authorization checks that *aren't* "row missing" (e.g. "fromId belongs to the caller") also live at the route layer. The repo exposes the predicate (`entitiesRepo.ownsAll`, `chatSessionsRepo.existsForUser`) and the route decides whether that's a 422 or a 404.

```ts
// ✅ Correct — routes/ontology.ts: ownership check at the route, not in createRelationship
const owned = await entitiesRepo.ownsAll(user.id, [body.fromId, body.toId]);
if (!owned) throw new HTTPException(422, { message: "fromId or toId does not belong to the user" });
const row = await entitiesRepo.createRelationship(user.id, body);
```

```ts
// ❌ Wrong — repo throws HTTPException, couples data layer to HTTP
async getById(userId: string, id: string): Promise<Memory> {
  const { data } = await serviceClient.get()...maybeSingle().throwOnError();
  if (!data) throw new HTTPException(404, { message: "Memory not found" });
  return data;
}
```

## Request-body schemas are HTTP semantics too — they live with the route

The same split applies to the zod schema validating a write. It describes what an HTTP
client may send, so it belongs in the route file, never in `@modules/db` or another
shared module — even when the repository needs a type for the same write.

The pull toward the wrong answer is real: `modules-never-import-from-backend`
means a shared repo cannot import the route's schema, which makes "just declare it in
`@modules/db`" look like the only option. It isn't. The repo's write type derives from
the **row**, which is the only thing that layer knows about:

```ts
// ✅ Correct — modules/db/src/skills-repository.ts
type SkillWrite = Pick<SkillRow, "name" | "description" | "prompt">;

// ✅ Correct — packages/backend/src/lambda-api/routes/skills.ts
const skillWriteSchema = z.object({
  // Invoked as `/<name>`, so no whitespace and no slash.
  name: z.string().min(1).regex(/^[^\s/]+$/),
  description: z.string(),
  prompt: z.string().min(1),
});
export type SkillWriteBody = z.infer<typeof skillWriteSchema>;
```

```ts
// ❌ Wrong — modules/db/src/skill.ts. The `/name` invocation syntax is a fact about
// the composer and the HTTP surface; the data layer has no business asserting it,
// and every consumer of @modules/db now carries the route's validation rules.
export const skillWriteSchema = z.object({
  name: z.string().min(1).regex(/^[^\s/]+$/),
  description: z.string(),
  prompt: z.string().min(1),
});
```

The frontend reads the request type from the route (`@backend/lambda-api/routes/<x>`),
exactly as it already does for every other write body.
