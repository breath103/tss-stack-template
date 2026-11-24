---
topic: Migrations and tables
order: 70
---

# When you add a table the frontend caches, give it one real id column; never build an id from two columns on the client.

`entity-repository`'s `EntityConfig` types `id` as `keyof Definitions[Table] & string` — a **single** real column. It cannot key on a composite `(a, b)` and it cannot key on a value that isn't a column. Every entity in `RepositoryContext` is therefore a raw `Selectable<Database[table]>` row keyed on one of its own columns.

When a join table has a composite primary key and no surrogate `id` (e.g. `team_members (team_id, user_id)`), the wrong fix is to invent a synthetic id on the frontend — `` `${teamId}:${userId}` `` — and store a join-shaped read-model. That reintroduces exactly the bespoke response model that `load-and-render-persisted-data-through-the-repository` forbids: the row is no longer a table row, can't dedupe against the cache, and every consumer speaks a made-up vocabulary.

**The fix is in the database, not the frontend:** give the table a real `id uuid primary key default gen_random_uuid()` and demote the composite key to a `unique(a, b)` constraint (mirroring `organization_members`). Then the frontend keys the entity on the real `id` like every other table. If the migration is already merged/deployed, stack a new migration; if it's unmerged, edit it in place.

```ts
// ✅ team_members has a real `id` column (added in its migration); key on it.
const entityConfig = {
  team_members: { id: "id" },
  organization_members: { id: "id" },
} as const satisfies EntityConfig<Entities>;

// A view that needs identity fetches both tables and cross-references by FK:
const teamMembers = useObservableList("team_members", team.id, { filter: tm => tm.team_id === team.id });
const name = usersById.get(member.user_id)?.name;   // cross-reference, don't store a joined shape
```

```ts
// ❌ Table lacks a real id → synthetic composite id + join read-model on the frontend.
export type TeamMemberEntity = TeamMemberWithUser & { id: string; teamId: string };
const teamMemberId = (teamId: string, userId: string) => `${teamId}:${userId}`;   // fabricated key
repository.set("teamMembers", { ...m, teamId, id: teamMemberId(teamId, m.userId) });
```

Carve-out: none. If a table genuinely can't expose a single real key column, add one — do not work around it in the repository config.
