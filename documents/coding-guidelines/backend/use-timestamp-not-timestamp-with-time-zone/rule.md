---
topic: Migrations and tables
order: 40
---

# When you add a time column, use timestamp, not timestamptz.

Use plain `timestamp` for all timestamp columns. The app always passes UTC ISO strings — timezone conversion is unnecessary overhead.

```sql
-- ✅ Correct
created_at timestamp NOT NULL

-- ❌ Wrong
created_at timestamp with time zone NOT NULL
```

A naked `timestamp` carries no offset, so **whatever reads it has to supply UTC
itself**. Both pg pools here already do — `modules/db/src/db.ts` and the
better-auth pool in `packages/backend/src/lib/auth.ts` append `Z` before parsing
OID 1114. A third pool that skips that step gets values shifted by the host's
timezone, which is zero on Lambda and nine hours on a laptop in KST.

Same trap at the default: `CURRENT_TIMESTAMP` is a `timestamptz`, so assigning it
to a `timestamp` column recasts through the session timezone. Write
`(now() AT TIME ZONE 'utc')`.
