---
requires: supabase
---

# Use `timestamp` not `timestamp with time zone`

Use plain `timestamp` for all timestamp columns. The app always passes UTC ISO strings — timezone conversion is unnecessary overhead.

```sql
-- ✅ Correct
created_at timestamp NOT NULL

-- ❌ Wrong
created_at timestamp with time zone NOT NULL
```