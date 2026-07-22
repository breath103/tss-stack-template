---
requires: supabase
---

# Use `.throwOnError()` on every supabase-js call — never destructure `error` to re-throw it

Supabase's PostgrestBuilder has `.throwOnError()`. Use it. The
`{ data, error } = await ...; if (error) throw error;` pattern is six tokens
of boilerplate per call that does literally what `.throwOnError()` does in
one method call, and it tempts people to silently swallow errors when they
"handle" the `error` branch without re-throwing.

The destructured-`error` pattern is only acceptable when you need to
**inspect the error code** (e.g. branching on a Postgres unique-violation
`23505` to return a clean 409). Document that case with a comment.

```ts
// ✅ Correct — throwOnError, single destructure
const { data } = await supabaseServiceRole
  .from("astra_goals")
  .select()
  .order("id")
  .throwOnError();

// ✅ Correct — error introspection is the legitimate exception
const { data, error } = await supabaseServiceRole
  .from("astra_task_tags")
  .insert(params)
  .select()
  .single();
// 23505 = unique_violation; surface a clean 409 instead of a generic 500.
if (error?.code === "23505") {
  throw new HTTPException(409, { message: "..." });
}
if (error) throw error;
```

```ts
// ❌ Wrong — manual destructure + re-throw of every-call boilerplate
const { data, error } = await supabaseServiceRole
  .from("astra_goals")
  .select()
  .order("id");
if (error) throw error;
return data;
```

Same rule for `.delete()` (no data — just call `.throwOnError()` and
ignore the return).

```ts
// ✅ Correct
await supabaseServiceRole.from("astra_goals").delete().eq("id", id).throwOnError();
```

```ts
// ❌ Wrong
const { error } = await supabaseServiceRole.from("astra_goals").delete().eq("id", id);
if (error) throw error;
```