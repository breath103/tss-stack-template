---
requires: supabase
---

# Name a new migration to sort after the latest existing file

This repo's migration timeline runs **ahead of the calendar** — the newest files
in `supabase/migrations/` are dated further in the future than today. So naming a
new migration with today's date can land it *before* migrations already applied
on the remote DB. `supabase db push` refuses to insert an out-of-order migration
and fails with:

```
Found local migration files to be inserted before the last migration on remote
database. Rerun the command with --include-all flag to apply these migrations
```

`--include-all` forces it, but then your migration is permanently wedged in the
middle of history for no reason. Instead, pick a timestamp one step past the last
file so it applies at the head, in order.

```bash
# ✅ Correct — check the latest, go one past it
ls packages/backend/supabase/migrations | tail -1
#   20260717150000_app_update_broadcast_fn_timestamp.sql
# → name yours 20260717160000_… or 20260718…_…
```

```text
❌ Wrong — dated "today" (e.g. 20260704120000) when the head is 20260717150000.
   Sorts before applied remote migrations → db:push demands --include-all.
```

The timestamp only has to be monotonic against the existing files — it is **not**
a factual record of the calendar date. Match the timeline, not the wall clock.