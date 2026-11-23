---
topic: Migrations and tables
order: 30
---

# When you add a trigger, index, policy or view on a table, put it in the migration that creates that table.

Triggers, indexes, RLS policies, and views that reference table X should live in the migration that creates X — not in a sibling's migration. Scattering dependencies across migrations creates a timeline hazard: deleting X's migration (during a cleanup, a feature removal, or a schema redesign) breaks `db-reset.ts` on a clean checkout because some peer migration still references the now-missing table.

Symptom: `ERROR: relation "public.X" does not exist` during replay, inside a migration whose own table still exists.

Each migration should be a self-contained chunk of schema that can be removed with the feature it belongs to. Cross-table artifacts tie unrelated features together on the SQL timeline — a "channels" migration that also installs a realtime trigger on `memory_nodes` means you can't drop `memory_nodes` without surgically editing the channels migration.

```sql
-- ✅ Correct — trigger lives in the table it watches
-- 20260212_create_memory_nodes.sql
create table memory_nodes (...);
create trigger memory_nodes_realtime_changes after insert or update or delete
  on memory_nodes for each row execute function broadcast_user_changes();
```

```sql
-- ❌ Wrong — trigger on memory_nodes stashed inside the channels migration
-- 20260213_create_channels.sql
create table channels (...);
create trigger memory_nodes_realtime_changes after insert or update or delete
  on memory_nodes for each row execute function broadcast_user_changes();
-- Later: delete 20260212_create_memory_nodes.sql → db reset breaks here
```

If a helper function (e.g. `broadcast_user_changes()`) is shared across tables, define it in its own earlier migration; then each table's migration creates its own trigger using it.
