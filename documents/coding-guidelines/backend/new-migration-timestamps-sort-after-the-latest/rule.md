---
topic: Migrations and tables
order: 10
---

# When you name a migration file, give it a timestamp later than the newest existing migration.

This repo's migration timeline runs **ahead of the calendar** — the newest files
in `migrations/` are dated further in the future than today. So naming a
new migration with today's date can land it *before* migrations already applied
on the remote DB. `db_migrate` refuses to insert an out-of-order migration
and fails with:

```
Found local migration files to be inserted before the last migration applied to
the database. Rerun with --include-all to apply these migrations
```

`--include-all` forces it, but then your migration is permanently wedged in the
middle of history for no reason. Instead, pick a timestamp one step past the last
file so it applies at the head, in order.

```bash
# ✅ Correct — check the latest, go one past it
ls packages/backend/migrations | tail -1
#   20260717150000_projects_add_archived_at.sql
# → name yours 20260717160000_… or 20260718…_…
```

```text
❌ Wrong — dated "today" (e.g. 20260704120000) when the head is 20260717150000.
   Sorts before applied remote migrations → db_migrate demands --include-all.
```

The timestamp only has to be monotonic against the existing files — it is **not**
a factual record of the calendar date. Match the timeline, not the wall clock.