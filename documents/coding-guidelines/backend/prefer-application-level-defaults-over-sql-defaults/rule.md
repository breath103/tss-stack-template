---
topic: Migrations and tables
order: 50
---

# When the app always writes a column, set its default in application code, not as a SQL DEFAULT.

Set default values in application code, not in SQL `DEFAULT` clauses. This keeps business logic in one place and makes the Insert type match the Row type (no optional fields).

Exception: `gen_random_uuid()` for primary keys is fine as a SQL default.

```sql
-- ✅ Correct - no SQL default, application provides the value
create table client_authorizations (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  ...
);
```

```typescript
// ✅ Correct - application sets the default
.insert({
  status: "pending",
  device_info: { ... },
  ...
})
```

```sql
-- ❌ Wrong - default hidden in SQL
create table client_authorizations (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  ...
);
```
