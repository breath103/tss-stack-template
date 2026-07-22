---
requires: supabase
---

# Don't decompose a record into a derived row type — return the real record

When an RPC or query returns rows that **are** an existing entity (tasks,
comments, projects…), return that entity's **real record type**. Never invent a
bespoke flattened/denormalized projection that decomposes the record and staples
on fields from other tables (`work_title`, `task_title`, `rank`, a `snippet`…).

A decomposed row type is a new entity you now have to define, type on the
frontend, and keep in sync — and it throws away the real `Task` / `Comment` the
rest of the app already knows how to render, open, and mutate. The join context
(work title, ancestor chain, a text snippet) is a **view model**: derive it on
the frontend from the real records, or resolve it via the existing per-entity
subscriptions — don't bake it into the row the DB hands back.

For a Postgres function, `RETURNS SETOF <table>` makes the generated type the
table `Row` type. Reach for `RETURNS TABLE (...)` **only** for a genuine
aggregate that is not any single record (a `GROUP BY` count, a cross-entity
rollup) — never just to bolt a couple of joined columns onto an entity.

Using an RPC is fine. Writing raw SQL is fine. Returning a *decomposed shape* is
the violation.

```sql
-- ✅ Correct — the hits ARE tasks / comments, so return the records
CREATE FUNCTION search_tasks(p_project_ids text[], p_query text, p_limit int)
RETURNS SETOF tasks LANGUAGE sql STABLE AS $$
  SELECT * FROM tasks
  WHERE project_id = ANY (p_project_ids)
    AND (title ILIKE '%'||p_query||'%' OR tiptap_doc_text(body) ILIKE '%'||p_query||'%')
  ORDER BY title LIMIT p_limit;
$$;
-- generated type: Returns Database["public"]["Tables"]["tasks"]["Row"][]
-- route returns Task[]; the frontend derives [work › task] crumbs from the records.
```

```sql
-- ❌ Wrong — a bespoke row that decomposes the task and denormalizes joins
CREATE FUNCTION search_tasks(...)
RETURNS TABLE (project_id text, task_id text, work_title text, task_title text, rank real)
...
-- forces a hand-written frontend type, loses the real Task, and duplicates
-- vocabulary (work_title/task_title) the entity already carries.
```

Carve-out: a true aggregate with no underlying record — `RETURNS TABLE (id text,
count int)` for a grouped count — is fine; there is no single row it decomposes.