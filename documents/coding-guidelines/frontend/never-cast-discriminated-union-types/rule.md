# Never cast discriminated union types

When a type is already a discriminated union, never cast it to `Record<string, unknown>` or any other type. Use the discriminant to narrow and let TypeScript infer the config shape.

```typescript
// ✅ Correct - narrow via discriminant, TypeScript infers config type
if (memory.metadata.type === "call") {
  memory.metadata.counterpart; // string[]
}
```

```typescript
// ❌ Wrong - casting away the union type
const metadata = memory.metadata as Record<string, unknown>;
metadata.counterpart as string[];
```
