# Frontend Coding Guidelines

---

## Use typed ApiClient for all API calls

Never use raw `fetch()`. Use `ApiClient` from `packages/frontend/src/lib/api-client.ts`.

```typescript
// ✅ Correct
import { ApiClient } from "../lib/api-client";
import type { ApiRoutes } from "@app/backend/api";

const api = new ApiClient<ApiRoutes>();
const health = await api.fetch("/api/health", "GET");
const hello = await api.fetch("/api/hello", "GET", { query: { name: "World" } });
```

```typescript
// ❌ Wrong
const response = await fetch("/api/health");
```

---

## Import backend types directly

Never duplicate types that exist in backend. Import them directly.

```typescript
// ✅ Correct
import type { SomeType } from "@app/backend/lib/some-type";
```

```typescript
// ❌ Wrong - duplicating backend types
interface SomeType {
  id: string;
  name: string;
}
```

---

## Use loadConfig() for configuration (scripts only)

In scripts (e.g., `scripts/dev.ts`, `scripts/deploy.ts`), use `loadConfig()` to read `tss.json`:

```typescript
import { loadConfig } from "@app/shared/config";
const config = loadConfig();
```

This does NOT apply to runtime code (`src/`) which runs in the browser and cannot access the filesystem.

---

## Run ESLint with --fix

```bash
npm run lint -- --fix
```
