---
requires: supabase
---

# Cross-table SQL objects belong in the target table's migration

Triggers, indexes, RLS policies, and views that reference table X should live in the migration that creates X — not in a sibling's migration. Scattering dependencies across migrations creates a timeline hazard: deleting X's migration (during a cleanup, a feature removal, or a schema redesign) breaks replay because some peer migration still references the now-missing table.

```sql
-- ✅ Correct — trigger lives in the table it watches
-- 20260212_create_memories.sql
create table memories (...);
create trigger memories_realtime_changes after insert or update or delete
  on memories for each row execute function broadcast_user_changes();
```

```sql
-- ❌ Wrong — trigger on memories stashed inside a channels migration
-- 20260213_create_channels.sql
create table channels (...);
create trigger memories_realtime_changes after insert or update or delete
  on memories for each row execute function broadcast_user_changes();
```

If a helper function is shared across tables, define it in its own earlier migration; then each table's migration creates its own trigger using it.