---
topic: Migrations and tables
order: 20
---

# When a PR has a migration that fixes another migration in the same PR, fold it into the one it fixes.

While developing you write a migration, run `./packages/backend/scripts/db_reset.ts`, notice a
mistake (a missing constraint, a column that should be NOT NULL), and add a second migration to
patch the first. That is fine while iterating. **Before opening the PR, fold the patch into the
original migration.** Production needs the final shape, not the iteration history, and a
reviewer has to re-merge the two files in their head to see what is being added.

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
❌ Wrong — two migrations from the same PR, the second fixing the first
20260712120000_budgets.sql
  CREATE TABLE budgets ( ..., schedule_start timestamp, schedule_end timestamp );

20260712130000_budgets_schedule_not_null.sql
  ALTER TABLE budgets ALTER COLUMN schedule_start SET NOT NULL;
  ALTER TABLE budgets ALTER COLUMN schedule_end   SET NOT NULL;
```

Keep them split when:
- The two migrations belong to different features that ship in the same PR.
- The change is a multi-step deployment (add a nullable column → backfill → set NOT NULL on a
  hot table).
- The earlier migration has already been applied to production
  (`db_migrate.ts --env=production`). An applied migration is immutable; the fix is a follow-up.
