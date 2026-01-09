# Coding Guidelines

## 1. All frontend-to-backend API calls must be typed

Never use raw `fetch()` for API calls. Always use the typed `ApiClient` from `packages/frontend/src/lib/api-client.ts`.

```typescript
// ✅ Correct - use the typed API client
import { ApiClient } from "../lib/api-client";
import type { ApiRoutes } from "@app/backend/api";

const api = new ApiClient<ApiRoutes>();

// Simple GET (options optional when no params/query/body needed)
const health = await api.fetch("/api/health", "GET");

// GET with query params
const hello = await api.fetch("/api/hello", "GET", { query: { name: "World" } });

// POST with path params and body
const result = await api.fetch("/api/echo/:id", "POST", {
  params: { id: "123" },
  body: { message: "Hello", count: 1, complexPayload: { tuple: ["a", 1, 2, 3] } },
});
```

```typescript
// ❌ Wrong - never use raw fetch
const response = await fetch("/api/health");
const data = await response.json();
```

**Why:**
- Compile-time type checking catches mismatched paths, methods, params, and body shapes
- Autocomplete for paths and methods
- Response types are automatically inferred from backend handler return types
- Refactoring backend routes surfaces frontend errors immediately

## 2. Import backend types directly—never duplicate them

Backend types are compiled to `.d.ts` and available to the frontend at build time. Import them directly.

```typescript
// ✅ Correct - import from backend
import type { SomeType } from "@app/backend/lib/some-type";
import type { ApiRoutes } from "@app/backend/api";
```

```typescript
// ❌ Wrong - duplicating types in frontend
interface SomeType {
  id: string;
  name: string;
}
```

**Why:**
- Single source of truth for types
- Backend changes automatically propagate to frontend
- No drift between frontend and backend type definitions
