---
topic: Repositories and services
order: 50
---

# When a write must be unique, let the unique index reject it and catch isUniqueViolation in the repo; never read first to check.

Uniqueness is a database invariant. Enforcing it with a read before the write is
slower *and* wrong: the read costs a round trip on every write, and it cannot actually
decide the question, because two concurrent writers both read "free" and then both
insert.

The unique index has to be handled regardless — it is the only thing that can reject
the loser of that race. Once the write path handles it, the pre-check is pure waste.

```ts
// ❌ Wrong — an extra round trip AND a race. Two simultaneous creates of the same
// name both see no clash, both proceed, and one dies with an unmapped 500.
async function assertNameFree(orgId: string, name: string, selfId: string | null) {
  const clash = (await skillsRepo.list(orgId)).find(s => s.name === name && s.id !== selfId);
  if (clash) throw new HTTPException(409, { message: `'${name}' already exists` });
}

route("/api/organizations/:orgId/skills", "POST", {
  handler: async ({ params, body, c }) => {
    await assertNameFree(orgId, body.name, null);
    return { skills: [await skillsRepo.create(orgId, body)] };
  },
});
```

Reading the whole collection to answer a question about one row also violates
`frontend/never-fetch-a-collection-to-resolve-one-entity` — but note that narrowing it
to a targeted `byName` query would still leave the race. The read is not the bug; the
pre-check is.

```ts
// ✅ Correct — the constraint answers. The REPO catches the violation and, on an
// insert, returns `null`; the route maps `null` to the status. No SQLSTATE above the data layer
// — a route that knows what
// "23505" means has hard-coded Postgres into the HTTP layer, and it is a lint
// error: `local/no-db-internals-outside-repository`.

// skills-repository.ts
/** `null` = that name is taken in this org; `skills_org_id_name_key` decides. */
async create(orgId: string, input: SkillInput): Promise<SkillRow | null> {
  try {
    return await db.get().insertInto("skills").values(...).returningAll().executeTakeFirstOrThrow();
  } catch (error) {
    if (isUniqueViolation(error, "skills_org_id_name_key")) return null;
    throw error;
  }
}

// routes/skills.ts
route("/api/organizations/:orgId/skills", "POST", {
  handler: async ({ params, body, c }) => {
    const skill = requireOrThrow(
      await skillsRepo.create(orgId, body),
      () => new HTTPException(409, { message: `A skill named '${body.name}' already exists` })
    );
    return { skills: [skill] };
  },
});
```

On an INSERT you often need no `catch` at all — Kysely's
`.onConflict(oc => oc.columns([...]).doNothing()).returningAll().executeTakeFirst()`
already resolves to `undefined` when the row loses the race. Reach for the catch
when there is no `onConflict` to hang it on, which in practice means `UPDATE`.

## An UPDATE can also miss, so it returns `Result`, not `null`

An insert has one way to fail, so `null` = taken is unambiguous. A rename has two: the
row is gone, or the new value collides. `null` cannot carry both, so the repo returns
`Result` (`lib/result.js`) with one code per failure and the route maps both in one
`throwOr`. Never `executeTakeFirstOrThrow()` here: it turns the missing row into a 500.

```ts
// ✅ Correct — users-repository.ts
async changeEmail(
  userId: string,
  email: string
): Promise<Result<UserRow, { code: "user_not_found" } | { code: "user_email_taken" }>> {
  try {
    const row = await db.get().updateTable("better_auth.user").set({ email })
      .where("id", "=", userId).returningAll().executeTakeFirst();
    return row === undefined ? Result.failure({ code: "user_not_found" }) : Result.success(row);
  } catch (error) {
    if (isUniqueViolation(error, "user_email_key")) return Result.failure({ code: "user_email_taken" });
    throw error;
  }
}

// routes/admin.ts
const user = (await userAdminService.changeEmail(params.userId, body.email)).throwOr(failure => {
  switch (failure.code) {
    case "user_not_found":
      return userNotFound();
    case "user_email_taken":
      return new ApiError(409, { type: "user_email_taken", email: body.email });
  }
});
```

`backend/repo-miss-returns-null-route-throws-404` has the full table of which
return type goes with which method.

## Requirements

- **The index must exist.** A migration with `create unique index … on t (org_id, name)`
  is what makes this correct; without it there is no invariant to lean on. See
  `verify-unique-constraint-before-on-conflict`.
- **Scope the catch, and put it in the repo.** Use `isUniqueViolation(error, constraint)`
  from `@modules/db` and name the constraint — a table with two unique indexes
  otherwise reports the wrong one as the reason. Re-throw everything else: a broad
  `catch` turns an unrelated failure into a misleading 409.
- **The same applies to updates**, not just inserts. A rename collides exactly like a
  create does; it reports the collision as a `Result` failure (above), not `null`.

## When a read genuinely is required

If the response has to distinguish *which* of several constraints was violated, read
`error.constraint` off the violation — still on the failure path, still one round trip.
Do not go back to reading first.
