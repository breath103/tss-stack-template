---
requires: supabase
---

# All DB access goes through a per-feature repository singleton class

Route handlers must NOT call `supabaseServiceRole.from("table")` directly. Every
feature has a **repository singleton class** at `src/lib/<feature>/repository.ts`
that wraps all DB reads/writes for that feature. The file exports a
single instance (`export const fooRepository = new FooRepository()`).
Routes import the singleton and call methods on it.

Why a class (not bare functions): grouping queries on `this` makes the
unit clear, lets us inject test doubles by swapping the export, and gives
us a single attachment point for cross-cutting concerns (logging,
retries, transactions, request-scoped clients) without changing every
callsite.

```ts
// ✅ Correct — singleton class, exported instance
// src/lib/astra/repository.ts
class AstraRepository {
  async listGoals() {
    const { data } = await supabaseServiceRole.from("astra_goals").select().order("id").throwOnError();
    return data;
  }
  async getGoalById(id: string) { /* ... */ }
}
export const astraRepository = new AstraRepository();

// src/routes/astra.ts
route("/api/astra/goals", "GET", {
  handler: async ({ c }) => {
    c.get("requireUser")();
    return { data: { goals: await astraRepository.listGoals() } };
  },
});
```

```ts
// ❌ Wrong — handler reaches into Supabase directly
route("/api/astra/goals", "GET", {
  handler: async ({ c }) => {
    c.get("requireUser")();
    const { data } = await supabaseServiceRole.from("astra_goals").select().order("id").throwOnError();
    return { data: { goals: data } };
  },
});
```

```ts
// ❌ Wrong — bare functions instead of a class
export async function listGoals() { /* ... */ }
export async function getGoalById(id: string) { /* ... */ }
```

Validation that needs a DB lookup (does this parent exist? does this row
have children?) calls repository methods — never `supabaseServiceRole` directly.
Other `lib/` helpers depend on the repository for any data access.