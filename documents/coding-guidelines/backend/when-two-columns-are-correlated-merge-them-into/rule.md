---
requires: supabase
---

# When two columns are correlated, merge them into one jsonb

Supabase's `OverrideTableColumns` in `types/database.ts` merges column-by-column. A Row type like `{ role: "user"; content: UserText } | { role: "assistant"; content: AssistantContent }` gets flattened — TypeScript loses the correlation and `role` and `content` become independent fields typed with their full unions. Inserting a mismatched pair (`role: "user"` + tool_call content) type-checks.

When columns are semantically correlated, store them together in a single `jsonb` column typed as a discriminated union. The override sees one column, the union survives end-to-end.

```sql
-- ✅ Correct — single jsonb column, correlation preserved
create table chat_messages (
  id uuid primary key,
  chat_id uuid references chats(id),
  content jsonb not null  -- { role, ...} discriminated union
);
```

```typescript
// ✅ Correct — one column, one union, TS tracks role ↔ content
type ChatMessageContent =
  | { role: "user"; text: string }
  | { role: "assistant"; blocks: AssistantBlock[] };

chat_messages: {
  Row: { content: ChatMessageContent };
};
```

```sql
-- ❌ Wrong — two columns, correlation lost at TS type level
create table chat_messages (
  role text not null,
  content jsonb not null
);
```