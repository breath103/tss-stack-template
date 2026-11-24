---
topic: Repositories and services
order: 60
---

# When you write .onConflict(column), first confirm in the migration that the column has a PRIMARY KEY or UNIQUE constraint.

Postgres throws at runtime if `ON CONFLICT (col)` doesn't match an existing `UNIQUE` or `PRIMARY KEY` constraint:

```
no unique or exclusion constraint matching the ON CONFLICT specification
```

Before adding `.onConflict((oc) => oc.column("X").doUpdateSet(...))`, open the migration file and confirm `X` is in a `PRIMARY KEY` or `UNIQUE` clause. The Supabase `.upsert()` API hid this footgun by defaulting to `ON CONFLICT (id)` — auto-generated ids never collide, so the upsert silently degraded to a plain insert. Kysely makes you state the column explicitly, which means you have to verify it.

```ts
// ✅ Correct — profiles PK is user_id
await db.get()
  .insertInto("profiles")
  .values({ user_id, ...rest })
  .onConflict((oc) => oc.column("user_id").doUpdateSet({ ...rest }))
  .execute();
```

```ts
// ❌ Wrong — user_skills PK is `id`; no unique on user_id; Postgres errors at runtime
await db.get()
  .insertInto("user_skills")
  .values({ user_id, data })
  .onConflict((oc) => oc.column("user_id").doUpdateSet({ data }))  // crashes
  .execute();

// ✅ Correct for that case — just insert (the original `.upsert(.)` was a misnamed insert all along)
await db.get()
  .insertInto("user_skills")
  .values({ user_id, data })
  .returningAll()
  .executeTakeFirstOrThrow();
```

If you want true upsert semantics on a non-PK column, add a `UNIQUE` constraint via migration first.
