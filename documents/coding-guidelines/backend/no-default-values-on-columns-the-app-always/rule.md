---
requires: supabase
---

# No default values on columns the app always provides

Never add `DEFAULT` to columns that the application always explicitly sets on insert. Defaults hide bugs — if the app forgets to pass a value, a silent default masks the error instead of failing loudly.

```sql
-- ✅ Correct — app always provides these values
created_at timestamp NOT NULL,
updated_at timestamp NOT NULL,
scopes text[] NOT NULL

-- ❌ Wrong — misleading defaults that will never be used
created_at timestamp NOT NULL DEFAULT now(),
updated_at timestamp NOT NULL DEFAULT now(),
scopes text[] NOT NULL DEFAULT '{}'
```

Only use `DEFAULT` when the column genuinely has an optional default that callers may omit (e.g., `status text NOT NULL DEFAULT 'pending'` where some inserts intentionally skip setting status).