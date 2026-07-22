---
requires: supabase
---

# Auto-reseed: the most important consequence

Because every scenario starts with a fresh DB, **you never write setup code that says "find an existing X" or "skip if Y is already there."** The baseline is deterministic.

The baseline is a **pinned snapshot of production**, loaded by `db:seed` (see `packages/backend/package.json` for the pinned timestamp). It is not hand-written fixture data.

IDs you can reference directly:

- Orgs: `o1`.. — the real org hierarchy.
- Users: `p1`.. — `p24` is the bootstrap admin (`system.coordinator@unastella.com`), which is what `devLogin` wants in most scenarios.

**Do not hardcode project or task IDs.** They're server-generated (`P21`, `P53`, …), they carry no ordering guarantee, and they change whenever the snapshot is refreshed. Create what you need via `POST /api/projects` and use the IDs it returns — see `adding-test-data`.

Org and user IDs are stable enough to reference because the snapshot preserves them across refreshes, but treat any specific *count* ("18 orgs", "500 tasks") as a moving target — assert on what your scenario created, not on totals.

**If you need different seed data**, refresh the snapshot rather than editing fixtures: `npm run -w backend db:dump`, then pin the printed timestamp in `packages/backend/package.json`. `seed.json` / `seed.ts` no longer exist.