# Route file structure

Routes use TanStack Router with manual route definitions (not file-based auto-generation). Each route lives in a `_route.tsx` file inside a directory that mirrors the URL path.

**Convention:**
- Each URL segment gets its own directory under `src/routes/`
- The route definition goes in `_route.tsx` inside that directory
- Dynamic segments use `$param` directories (e.g. `$memoryId/`, `$chatId/`)
- Sibling components are colocated in the same directory as `_route.tsx`
- Parent route is imported via relative path (e.g. `../_route`) — not absolute `@/routes/...`
- The `path` in `createRoute` declares the segment(s) from the parent — it does NOT repeat the full URL

```typescript
// ✅ Correct — _route.tsx with relative parent import
// File: settings/integrations/_route.tsx
import { createRoute } from "@tanstack/react-router";
import { settingsRoute } from "../_route";
import { IntegrationsPage } from "./IntegrationsPage";

export const integrationsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/integrations",
  component: IntegrationsPage,
});
```

```typescript
// ❌ Wrong — route defined in a named .tsx file, not _route.tsx
// File: settings/IntegrationsView.tsx
export const integrationsRoute = createRoute({ ... });

// ❌ Wrong — absolute import for parent route
import { settingsRoute } from "@/routes/settings/_route";
```
