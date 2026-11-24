---
topic: Repositories and services
order: 30
---

# When a repo update can both miss the row and hit a unique conflict, return a Result with a code for each; the route maps it with throwOr.

`null` has one meaning per method, and on a read or an update that meaning is "no such row"
(`backend/repo-miss-returns-null-route-throws-404`). An update that can miss **and** hit a unique index has two ways to fail, so it returns `Result<T, { code: "x_not_found" } | { code: "x_taken" }>` from `lib/result.js`, and the route calls `.throwOr(failure => { switch (failure.code) … })`.

This is where code goes wrong: `null` cannot mean both "missing" and "taken".

```ts
// ❌ Wrong — `null` means "slug taken", so a missing row has to throw (a 500), or the
// route adds a pre-read just to produce the 404.
async updateProject(projectId: string, input: ProjectInput): Promise<ProjectRow | null> {
  try {
    return await db.get().updateTable("projects").set(input).where("id", "=", projectId)
      .returningAll().executeTakeFirstOrThrow();
  } catch (error) {
    if (isUniqueViolation(error, "projects_slug_key")) return null;
    throw error;
  }
}
```

```ts
// ✅ Correct — projects-repository.ts: one statement, both failures named
async updateProject(
  projectId: string,
  input: ProjectInput
): Promise<Result<ProjectRow, { code: "project_not_found" } | { code: "project_slug_taken" }>> {
  try {
    const row = await db.get().updateTable("projects").set(input).where("id", "=", projectId)
      .returningAll().executeTakeFirst();
    return row === undefined ? Result.failure({ code: "project_not_found" }) : Result.success(row);
  } catch (error) {
    if (isUniqueViolation(error, "projects_slug_key")) return Result.failure({ code: "project_slug_taken" });
    throw error;
  }
}

// ✅ routes/project.ts — the switch is exhaustive, so a new failure code is a type error here
const project = (await projectsRepo.updateProject(projectId, body)).throwOr(failure => {
  switch (failure.code) {
    case "project_not_found":
      return new ApiError(404, { type: "project_not_found" });
    case "project_slug_taken":
      return new ApiError(409, { type: "project_slug_taken" });
  }
});
```

`usersRepo.changeEmail` is the same shape. A neighbouring `update…` that still ends in `executeTakeFirstOrThrow()` is not a precedent for a method a route calls.
