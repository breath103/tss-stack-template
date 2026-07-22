---
requires: supabase
---

# Every new `public` table must attach `audit_changes` in the same migration

The `audit_log` system (`20260617120000_audit_log.sql`) captures every
INSERT/UPDATE/DELETE via an AFTER trigger named `audit_changes`. That migration
attached the trigger to every then-existing `public.*` table via a one-shot
`DO` block. **Any table created after that point must attach the trigger
itself, in the same migration that creates it.**

This has been missed three times (`objectives`, `task_related_users`,
`tasks_views`) — each one silently un-audited on production, with no symptom
until someone went looking. A fresh `db:reset` HIDES the bug locally because
files apply in filename order, so audit_log's DO loop sees the table; on
production, supabase applies pending migrations forward in time, so any
post-audit-log table is invisible to the loop.

## Rule

In any migration that contains `CREATE TABLE public.<name>` (or
`CREATE TABLE <name>` in the public schema), the same migration must also
contain a matching:

```sql
CREATE TRIGGER audit_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.<name>
  FOR EACH ROW EXECUTE FUNCTION public.audit_record_change();
```

`check.sh` enforces this mechanically: scans every migration file for
`CREATE TABLE`, fails if the same file does not also attach `audit_changes`
to that table. Exempt: `audit_log` itself, and the original
`20260617120000_audit_log.sql` (whose DO loop handles the initial attach).