---
topic: Migrations and tables
order: 60
---

# When you add a column the app reads, give it local data: backfill in the migration or refresh the seed data.

Local data is the project's seed data, and the seed was written before your migration.
So a migration that adds a column the app reads lands with that column **empty
everywhere locally** — every row takes the default. Local dev, e2e, and the demo
pages have no data exercising the new feature, and the gap stays invisible until
someone opens the UI weeks later and finds it always blank.

Running the migration is not enough. Pick one, in the same PR:

1. **Refresh the seed** — add realistic values for the column to the seed data
   the local DB loads, so the seeded rows exercise the feature. Best option; the
   UI shows the column the way production will.
2. **Backfill in the migration** — if the column is derivable from existing rows
   (a computed default, a denormalized copy), populate it with an `UPDATE` in the
   migration itself. Then every database, seeded or not, gets correct data.
3. **Say why neither applies** — the column is internal (audit bookkeeping, a
   flag nothing renders). State that in the PR and move on.

What you must not do is ship the column, notice the UI is blank locally, and
assume it's a stale-seed artifact someone else will fix. That assumption
is how a feature reaches production with zero local coverage.

Note the ordering trap: seed data written *before* your migration still loads cleanly
against the new schema — it never names the new column, so the column just takes
its default. **A clean seed is not evidence the column works.**

A column that holds a credential is the exception to option 1: seed it with an
obviously fake placeholder, never a real secret, or the seed file commits it to
the repo and every developer's local DB.
