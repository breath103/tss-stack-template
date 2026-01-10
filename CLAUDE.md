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

## 3. Use `loadConfig()` to read `tss.json`

```typescript
import { loadConfig } from "@app/shared/config";

const config = loadConfig();
const port = config.backend.devPort;
```

## 4. Declare env vars in `env.d.ts`—never use `!` assertion

Always declare environment variables in `src/env.d.ts`. Never use `process.env.FOO!`.

```typescript
// ✅ Correct - declare in env.d.ts
// packages/backend/src/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    MY_VAR: string;
    OPTIONAL_VAR?: string;
  }
}

// Then just use it
const value = process.env.MY_VAR; // string, no assertion needed
```

```typescript
// ❌ Wrong - non-null assertion
const value = process.env.MY_VAR!;
```

## 5. Verify library config options by checking types—never guess

When configuring third-party libraries, always verify where options belong by checking the actual type definitions or source code. Never assume option placement based on documentation skimming or guessing.

```typescript
// ✅ Correct - verify the type first
// Check: node_modules/better-auth/dist/auth/auth.d.mts
// or use IDE "Go to Definition" on the config object
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  advanced: {
    trustedProxyHeaders: true,  // Verified: belongs under `advanced`
  },
});
```

```typescript
// ❌ Wrong - guessing option placement without checking types
export const auth = betterAuth({
  trustedProxyHeaders: true,  // WRONG: not a top-level option
});
```

**How to verify:**
1. Use IDE "Go to Definition" (Cmd+Click / Ctrl+Click) on the config type
2. Read the `.d.ts` or `.d.mts` type definitions in `node_modules`
3. Search the library source code: `grep -r "optionName" node_modules/library/dist`
4. Check how the option is actually consumed in the library code

**Why:**
- Library documentation can be outdated or incomplete
- TypeScript types are the source of truth for config shape
- Wrong option placement silently fails (option is ignored, no error)
- Debugging misplaced options wastes significant time
