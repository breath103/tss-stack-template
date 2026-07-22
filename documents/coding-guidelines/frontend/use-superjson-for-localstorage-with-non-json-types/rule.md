# Use superjson for localStorage with non-JSON types

When storing objects that contain `Date`, `Map`, `Set`, or other non-JSON-native types in localStorage, use `superjson` instead of `JSON.stringify` / `JSON.parse`. Encapsulate the cache in a typed class with `get` / `set` / `clear` methods.

```typescript
// ✅ Correct - superjson preserves Date types automatically
import superjson from "superjson";

class SessionCache<T extends { session: { expiresAt: Date } }> {
  constructor(private key: string) {}

  get(): T | null {
    const stored = localStorage.getItem(this.key);
    if (!stored) return null;
    return superjson.parse<T>(stored);
  }

  set(value: T): void {
    localStorage.setItem(this.key, superjson.stringify(value));
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}
```

```typescript
// ❌ Wrong — manual Date reconstitution at every read site
const stored = JSON.parse(localStorage.getItem(key)!);
stored.session.expiresAt = new Date(stored.session.expiresAt);
stored.user.createdAt = new Date(stored.user.createdAt);
```
