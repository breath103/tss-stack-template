---
requires: supabase
---

# Verify the unique constraint exists before writing `ON CONFLICT (col)`

Postgres throws at runtime if `ON CONFLICT (col)` doesn't match an existing `UNIQUE` or `PRIMARY KEY` constraint:

```
no unique or exclusion constraint matching the ON CONFLICT specification
```

Before adding `.upsert(..., { onConflict: "col" })`, open the migration file and confirm `col` is in a `PRIMARY KEY` or `UNIQUE` clause. If you want true upsert semantics on a non-PK column, add a `UNIQUE` constraint via migration first.

```ts
// ✅ Correct — profiles PK is user_id
await supabase
  .from("profiles")
  .upsert({ user_id, ...rest }, { onConflict: "user_id" });
```

```ts
// ❌ Wrong — user_skills PK is `id`; no unique on user_id; Postgres errors at runtime
await supabase
  .from("user_skills")
  .upsert({ user_id, data }, { onConflict: "user_id" });  // crashes
```