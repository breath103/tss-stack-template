---
requires: supabase
---

# Never add compat stubs for infrastructure you've removed

If a historical migration references objects that came from a system you're no longer using, **rewrite the migration to be honest**. Don't add a stub migration that fakes the missing objects.

Fakes accrete — later devs see the stub, assume the objects matter, build more on top. Migrations aren't archival history of what the schema ever looked like; they're the replayable definition of what it IS now. Edit freely as long as no production DB has drifted state that depends on the old form.

```sql
-- ❌ Wrong — stub migration that recreates vanished infra
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, ...);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT NULL::uuid $$ LANGUAGE sql;
```

```sql
-- ✅ Correct — edit the original migration to drop references to vanished infra
create table user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,  -- FK added in a later migration
  data jsonb not null,
  created_at timestamptz not null
);
```

Parallel cleanup: if a migration's *entire content* becomes obsolete (a pure-RLS migration whose policies get dropped, a backfill migration whose source table no longer exists), delete the file. The migrations tracking table only records applied versions; missing files aren't errors on replay.