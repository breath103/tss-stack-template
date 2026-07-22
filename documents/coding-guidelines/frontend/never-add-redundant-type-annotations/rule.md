# Never add redundant type annotations

Never annotate a type that TypeScript already infers. Explicit annotations on variables, return types, and parameters are noise when the compiler knows the type.

```typescript
// ✅ Correct - type is inferred
const items = rows.map((r) => r.id);
const result = await api.fetch("/api/memories", "GET");
```

```typescript
// ❌ Wrong - redundant annotation
const items: string[] = rows.map((r) => r.id);
const result: { data: Memory[] } = await api.fetch("/api/memories", "GET");
```

Same for **explicit generic arguments** when a value already fixes the type parameter — `<Selector<PointSize> value={pointSize} …/>`, `fn<Foo>(foo)`. Drop the `<…>`; inference from the prop/argument is enough. Keep the explicit generic only when nothing else pins the type (e.g. `useState<Foo | null>(null)`, `value={null}`).
