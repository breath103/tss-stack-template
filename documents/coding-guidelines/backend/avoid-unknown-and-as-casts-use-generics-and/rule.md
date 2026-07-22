# Avoid `unknown` and `as` casts — use generics and inline construction

`unknown` is banned by ESLint. Instead of returning `unknown` and casting the result, make the function generic so callers specify the type at the call site.

```typescript
// ✅ Correct - generic return type, caller specifies T
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path);
  return res.json() as Promise<T>;
}
const data = await apiFetch<{ items: Event[] }>("/events");
```

```typescript
// ❌ Wrong - returns unknown, caller casts with as
async function apiFetch(path: string): Promise<unknown> {
  const res = await fetch(path);
  return res.json();
}
const data = (await apiFetch("/events")) as { items: Event[] };
```

Don't build objects imperatively with a mutable `Record<string, unknown>` — construct them inline as a single expression. TypeScript infers the type automatically.

```typescript
// ✅ Correct - single inline object, no type annotation needed
const data = await apiFetch<Event>(`/events/${id}`, {
  method: "PATCH",
  body: JSON.stringify({
    summary: params.title,
    start: params.start ? { dateTime: params.start } : undefined,
    description: params.description,
  }),
});
```

```typescript
// ❌ Wrong - mutable object, needs explicit type, multiple statements
const body: Record<string, unknown> = {};
if (params.title !== undefined) body.summary = params.title;
if (params.start !== undefined) body.start = { dateTime: params.start };
```
