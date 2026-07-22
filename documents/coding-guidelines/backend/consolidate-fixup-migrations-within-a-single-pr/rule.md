---
requires: supabase
---

# Consolidate fix-up migrations within a single PR before opening it

During development you'll often write a migration, run `db:reset`, notice a
mistake (forgot a constraint, wrong default, column should be NOT NULL), and
add a *second* migration to patch the first. That's fine while iterating —
but **before opening the PR, fold the patches into the original migration**.
Two migrations that exist only because the first was incomplete should ship
as one.

Production doesn't benefit from running your dev iteration history step by
step; it just needs the final shape. The fix-up file is also pure noise in
review — reviewers have to mentally re-merge it to see what's actually being
added.

```text
✅ Correct — one migration, the table as it should land
20260712120000_budgets.sql
  CREATE TABLE budgets (
    ...,
    schedule_start timestamp NOT NULL,
    schedule_end   timestamp NOT NULL
  );
```

```text
❌ Wrong — two migrations from the same PR, second one fixing the first
20260712120000_budgets.sql
  CREATE TABLE budgets ( ..., schedule_start timestamp, schedule_end timestamp );

20260712130000_budgets_schedule_not_null.sql
  ALTER TABLE budgets ALTER COLUMN schedule_start SET NOT NULL;
  ALTER TABLE budgets ALTER COLUMN schedule_end   SET NOT NULL;
```

**Carve-outs (keep them split):**
- Two migrations genuinely belong to different features that happen to ship in the same PR.
- A migration that needs to run as a multi-step deployment (e.g. add nullable column → backfill → set NOT NULL on a hot table) — splitting is the safe-deploy pattern, not iteration noise.
- The earlier migration has *already* been pushed to the remote DB (`db:push`). Migrations are immutable once applied; the fix has to be a follow-up. (If unsure, `npm run -w backend db:push --dry-run` to see what's already there.)