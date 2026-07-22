# DB migrations — ordering, deploy plan, and the push

Read this whenever the diff adds or changes a file under
`packages/backend/supabase/migrations/**`. It covers three things: **which side
of land-pr the migration goes on** (this is a *decision*, not a fixed step), the
**deploy-plan** you write at design time, and the **mechanics of `db:push`**.

## The core constraint

CI deploys backend **code** automatically on merge to main. CI does **NOT** run
migrations. Production schema only moves when you run `npm run -w backend db:push`
from a local checkout linked to the remote project. So code-deploy and
schema-change are **decoupled and independently timed** — and you control the
migration's timing relative to the merge. That is exactly why ordering is a
decision you have to think through, not a fixed "always after land" step.

## Decide the ordering — THINK, don't default

The wrong mental model is "land, then push." The right question is: **is the
migration safe against the code that is currently live, and is the new code safe
against the schema that is currently live?** Answer that and the ordering falls
out. Three cases:

### 1. Expand (additive / backward-compatible) → migrate BEFORE land

New table, new nullable column, new column with a default, new index — anything
the currently-deployed old code neither reads nor is broken by. The NEW code
*requires* the schema.

- **Push the migration first, then land.** Run `db:push` from your branch (or
  from main once merged but *before* CI finishes deploying) so the column exists
  by the time the new code goes live. Zero window: new code never sees a missing
  column.
- Safe because an additive migration doesn't disturb the old code still running
  during the deploy.
- **Task-list placement:** the `db:push` task goes **before** the Land task.

### 2. Contract (destructive / removing) → migrate AFTER land

Drop column, drop table, tighten a constraint, remove a default — anything the
currently-deployed old code still *uses*. The NEW code has stopped using it.

- **Land first, then push.** land-pr → CI deploys code that no longer touches the
  column → *then* `db:push` drops it. If you dropped first, the still-live old
  code would 500 against the missing column.
- **Task-list placement:** the `db:push` task goes **after** the Land task.

### 3. Rename / incompatible type change → SPLIT into two PRs (expand then contract)

Never rename or retype a live column in a single in-place migration — there is no
single ordering that's safe, because both old and new code can't agree on the
column at once. Split it:

- **PR1 (expand):** add the new column, backfill, write to both. Migrate before
  land (case 1). Land + push.
- **PR2 (contract):** switch reads to the new column, stop writing the old one,
  drop the old column. Migrate after land (case 2). Land + push.

Two separate `/do-task` lifecycles.

## Deploy plan (write this at Step 3, design time)

If Step 3 writes a design doc, and the change has a migration, the doc MUST
include a **Deploy plan** section answering, in three short paragraphs:

1. **Which case (1/2/3 above) and why.** Name the ordering you picked and the
   reason — "additive nullable column, expand, migrate before land."
2. **What the window looks like.** Which routes/writes break if the ordering is
   wrong or the push is delayed. Be specific — "POST /api/objectives with
   project_ids 500s until the column exists."
3. **How big the window is in practice.** Run the push adjacent to land and the
   window is ~3 min (CI deploy time). Fine for low-traffic/admin surfaces, NOT for
   hot paths — for hot paths, case 1 or the two-PR split eliminates the window.

If you can't state which case you're in and why, the design isn't done — in
`manual` mode treat that as a Step 3 gate failure and fix the doc before asking
for approval.

## The push mechanics

1. **Confirm the working tree has the migration file** and (for case 2) local
   main is up to date: `git status --short --branch`. `db:push` reads migration
   files from the working tree.
2. **Run it:**
   ```bash
   npm run -w backend db:push
   ```
   Forward-only. NEVER pass `--reset` or any flag that touches remote state. If
   you don't know what a flag does, don't pass it. There is no remote reset.
3. **Verify.** `db:push` prints the migrations it applied — confirm your file is
   in the list. If it says "Remote database is up to date" but you expected your
   migration, the linked project is wrong — STOP and tell the user.
4. **If it fails on remote** (constraint violation on existing rows, missing
   dependency): the schema is now partially-mutated and the new code may be live.
   Tell the user immediately with the exact error. Do NOT attempt a destructive
   rollback (`supabase db reset` against remote is never the answer) — the fix is
   almost always a follow-up forward migration.

In `manual` mode, ask before pushing:

```
AskUserQuestion({
  question: "Migration <file> needs `db:push` to reach prod (CI doesn't run it). <case + timing>. Push now?",
  header: "DB push",
  options: [
    "Push now — apply migration to production",
    "Hold — I'll push manually",
  ]
})
```

In `auto` mode, push at the point the ordering decision dictates — and log the
case (1/2/3) in the summary so anyone reviewing the session sees why.
