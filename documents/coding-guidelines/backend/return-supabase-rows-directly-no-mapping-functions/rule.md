---
requires: supabase
---

# Return Supabase rows directly — no mapping functions

Never create `rowToX()` mapping functions. Return Supabase rows directly (snake_case). Override jsonb/enum fields via `OverrideTableColumns` in `types/database.ts`.

```typescript
// ✅ Correct - return rows directly
const { data } = await supabase.from("memories").select("*");
return data;
```

```typescript
// ❌ Wrong - unnecessary mapping
function rowToMemory(row: MemoryRow): Memory {
  return { id: row.id, userId: row.user_id };
}
const { data } = await supabase.from("memories").select("*");
return data.map(rowToMemory);
```