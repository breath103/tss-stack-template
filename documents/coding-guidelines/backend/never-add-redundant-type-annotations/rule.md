# Never add redundant type annotations

Never annotate a type that TypeScript already infers. Explicit annotations on variables, return types, and parameters are noise when the compiler knows the type.

Always start without type annotations. If eslint complains about an unresolved type, fix the underlying issue — don't add a type annotation as a workaround.

```typescript
// ✅ Correct - type is inferred
const baseUrl = c.get("baseUrl");
const items = rows.map((r) => r.id);
```

```typescript
// ❌ Wrong - redundant annotation
const baseUrl: string = c.get("baseUrl");
const items: string[] = rows.map((r) => r.id);
```
