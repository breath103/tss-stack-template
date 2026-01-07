# TSS Stack Template

Type-Safe Full Serverless Stack - A template for deploying full-stack TypeScript apps with branch-based preview environments.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CloudFront                               │
│                    (*.example.com)                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Lambda@Edge                                 │
│  - Extracts subdomain from Host header                          │
│  - Looks up backend URL from SSM Parameter Store                │
│  - Rewrites origin to correct Lambda Function URL               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ main backend │ │ feature-1    │ │ feature-2    │
│ Lambda       │ │ Lambda       │ │ Lambda       │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Project Structure

```
tss-stack-template/
├── tss.json                  # Project configuration
├── package.json              # Workspace root
├── packages/
│   ├── backend/              # Hono API on Lambda
│   │   ├── src/index.ts      # API routes
│   │   └── scripts/
│   │       ├── build.ts      # esbuild bundler
│   │       └── deploy.ts     # CDK deploy + SSM storage
│   ├── edge/                 # CloudFront + Lambda@Edge
│   │   ├── lib/
│   │   │   ├── viewer-request.ts  # CloudFront Function (subdomain extraction)
│   │   │   ├── origin-request.ts  # Lambda@Edge (request routing)
│   │   │   └── stack.ts           # CDK stack definition
│   │   └── scripts/deploy.ts      # Build + deploy
│   └── frontend/             # Vite + React SPA
│       ├── src/main.tsx
│       └── vite.config.ts    # Dev proxy to backend
```

## Configuration

`tss.json`:
```json
{
  "project": "myapp",
  "backend": { "region": "ap-northeast-2" },
  "ssm": { "region": "ap-northeast-2" },
  "domain": "example.com",
  "hostedZoneId": "Z1234567890"
}
```

## Commands

```bash
# Local development (runs backend + frontend concurrently)
npm run dev

# Deploy backend for a branch
npm run deploy:backend -- --name=main
npm run deploy:backend -- --name=feature/auth  # sanitized to feature--auth

# Deploy edge (CloudFront + Lambda@Edge + Route53)
npm run deploy:edge
```

## How Branch Deployments Work

1. `deploy:backend --name=feature/auth`:
   - Sanitizes branch name: `feature/auth` → `feature--auth`
   - Creates CloudFormation stack: `myapp-backend-feature--auth`
   - Creates Lambda with alias `feature--auth`
   - Stores Function URL in SSM: `/myapp/backend/feature--auth`

2. Lambda@Edge routing:
   - Request to `feature--auth.example.com`
   - Extracts subdomain: `feature--auth`
   - Looks up SSM: `/myapp/backend/feature--auth`
   - Rewrites origin to that Lambda Function URL

## Key Technical Details

### Backend (packages/backend)
- **Framework**: Hono (works on Lambda + local Node.js)
- **Runtime**: Node.js 20.x on Lambda
- **Build**: esbuild bundles to ESM
- **Handler export**: `export const handler = handle(app)`

### Type-Safe API Routes

Routes are defined using the `route()` function with full type inference:

```typescript
// packages/backend/src/api.ts
import { z } from "zod";
import { route, routes, type ExtractRoutes } from "./lib/route.js";

export const api = routes(
  // No params, no body - simple GET
  route("/api/health", "GET", {
    handler: () => ({ status: "ok", timestamp: Date.now() }),
  }),

  // Query params
  route("/api/hello", "GET", {
    query: { name: z.string().optional() },
    handler: ({ query }) => ({
      message: query.name ? `Hello, ${query.name}!` : "Hello!",
    }),
  }),

  // Path params + body with complex types
  route("/api/echo/:id", "POST", {
    body: {
      message: z.string(),
      payload: z.object({ tuple: z.tuple([z.string(), z.number()]) }),
    },
    handler: ({ params, body }) => ({
      id: params.id,           // string (inferred from path)
      msg: body.message,       // string
      first: body.payload.tuple[0],  // string (tuple element)
    }),
  }),
);

// Export type for frontend
export type ApiRoutes = ExtractRoutes<typeof api.routes>;
```

Features:
- Path params inferred from path string (`:id` → `{ id: string }`)
- Query/body types inferred from Zod schemas
- Complex nested types (tuples, objects) fully supported
- Same path with different methods handled correctly
- `ExtractRoutes` exports clean types for frontend API client

### Edge (packages/edge)
- **Lambda@Edge**: Must be in us-east-1
- **No env vars**: Lambda@Edge doesn't support environment variables, so `process.env.PROJECT` and `process.env.SSM_REGION` are injected at build time via esbuild's `define`
- **SSM caching**: Backend URLs cached for 60 seconds in Lambda memory

### Frontend (packages/frontend)
- **Framework**: Vite + React
- **Dev proxy**: `/api/*` proxied to `localhost:3001`
- **Build**: Standard Vite build (deploy to S3/CloudFront separately)

## Branch Name Sanitization

Git branch names are sanitized to be subdomain-safe (RFC 1123):
- `feature/auth` → `feature--auth`
- `Feature_Branch` → `feature-branch`
- `v1.2.3` → `v1-2-3`

Rules:
- Lowercase only
- `/` replaced with `--`
- Non-alphanumeric replaced with `-`
- Max 63 characters
- No leading/trailing hyphens

## AWS Resources Created

### Per backend deployment (`myapp-backend-{name}`):
- Lambda Function
- Lambda Alias
- Lambda Function URL
- IAM Role
- SSM Parameter (`/myapp/backend/{name}`)

### Edge deployment (`myapp-edge`):
- CloudFront Distribution
- Lambda@Edge Function (us-east-1)
- ACM Certificate (wildcard)
- Route53 A Records (root + wildcard)

## Tags

All resources tagged with:
- `project`: from config
- `environment`: branch name (backend only)

## Future Features (TODO)

- [x] Type-safe API routes with full inference
- [ ] `destroy` command for cleanup
