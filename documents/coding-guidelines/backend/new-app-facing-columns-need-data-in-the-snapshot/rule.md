---
requires: supabase
---

# A new app-facing column needs data in the snapshot

Local data is a pinned production dump, and the pin is older than your migration.
So a migration that adds a column the app reads lands with that column **empty
everywhere locally** — every row takes the default. Local dev, e2e, and the demo
pages have no data exercising the new feature, and the gap stays invisible until
someone opens the UI weeks later and finds it always blank.

There is no fixture file to edit anymore. Pick one, in the same PR:

1. **Refresh the pin** — once the column has real values in production, run
   `npm run -w backend db:dump` and pin the printed timestamp in
   `packages/backend/package.json`. Best option; the data is real.
2. **Backfill in the migration** — if the column is derivable from existing rows
   (a computed default, a denormalized copy), populate it with an `UPDATE` in the
   migration itself. Then every dump, old or new, gets correct data on load.
3. **Say why neither applies** — the column is internal (audit bookkeeping, a
   flag nothing renders). State that in the PR and move on.

What you must not do is ship the column, notice the UI is blank locally, and
assume it's a snapshot-staleness artifact someone else will fix. That assumption
is how a feature reaches production with zero local coverage.

Note the ordering trap: a dump taken *before* your migration still loads cleanly
against the new schema — `db:load` is data-only, so an added column just takes
its default. **A clean load is not evidence the column works.**