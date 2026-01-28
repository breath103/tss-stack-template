# TSS Stack Template

Type-Safe Serverless Stack for deploying full-stack TypeScript apps on AWS.

## Live Demo

- **Production (main)**: https://www.tsss.cloud/ 
- **Branch preview (branch1)**: https://branch1.tsss.cloud/

## Why

If you want a simple web app (no SSR) on your own AWS infrastructure:

- **Type-safe API calls** - Frontend imports backend types directly. No codegen, no runtime overhead.
- **Branch previews** - Deploy `feature/auth` branch to `feature--auth.yourdomain.com`
- **Single domain** - Backend API and frontend served from same domain. No CORS.
- **Authentication** - [better-auth](https://better-auth.com) with stateless sessions (no database required).
- **Your AWS account** - No vendor lock-in. You own everything.

## Quick Start

### 1. Setup

```bash
npm install
npm run setup
```

Or manually edit `tss.json`:

```json
{
  "project": "myapp",
  "repo": "yourorg/yourrepo",
  "backend": { "region": "ap-northeast-2" },
  "ssm": { "region": "ap-northeast-2" },
  "domain": "myapp.com",
  "hostedZoneId": "Z1234567890"
}
```

- `hostedZoneId` - from Route53. Create a hosted zone for your domain first.
- `repo` - your GitHub repo (org/repo format). Used for CI/CD setup.

### 2. Deploy

```bash
# Edge (CloudFront + Lambda@Edge) - run once
npm run deploy -w edge

# Backend
npm run deploy -w backend -- --name=main

# Frontend
npm run deploy -w frontend -- --name=main
```

### 3. Environment Variables

Define env vars in `src/env.d.ts`:

```typescript
// packages/backend/src/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;           // required
    OPTIONAL_KEY: string | undefined; // optional
  }
}
```

**Local dev**: Create `.env` in each package (gitignored):

```bash
# packages/backend/.env
DATABASE_URL=postgres://localhost/myapp
```

**CI/CD**: Set in `.github/workflows/deploy.yml`:

```yaml
- name: Deploy backend
  env:
    DATABASE_URL: "postgres://prod/myapp"
  run: npm run deploy -w backend -- --name=${{ github.ref_name }}
```

### 4. Authentication (Google OAuth)

Add to `packages/backend/.env`:

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
BETTER_AUTH_SECRET=random_32_char_secret
```

Set up Google OAuth at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with callback URL: `http://localhost:3000/api/auth/callback/google`

### 5. Dev

```bash
npm run dev
```

Runs edge proxy on `:3000`, backend on `:3001`, frontend on `:3002`.

## Type-Safe API

Define routes with full type inference:

```typescript
// packages/backend/src/api.ts
import { z } from "zod";
import { route, routes } from "./lib/route.js";

export const api = routes(
  route("/api/users/:id", "GET", {
    query: { include: z.string().optional() },
    handler: ({ params, query }) => ({
      id: params.id,  // inferred from path
      include: query.include,
    }),
  }),

  route("/api/users", "POST", {
    body: { name: z.string(), email: z.string().email() },
    handler: ({ body }) => ({ created: body.name }),
  }),
);
```

Frontend gets types automatically:

```typescript
// packages/frontend/src/lib/api-client.ts
import type { ApiRoutes } from "backend/api";

const api = new ApiClient<ApiRoutes>();

// Fully typed - params, query, body, response
const user = await api.fetch("/api/users/:id", "GET", {
  params: { id: "123" },
  query: { include: "posts" },
});
```

## Architecture

```
                    │ Request
                    ▼
            ┌──────────────┐
            │  CloudFront  │
            └──────┬───────┘
                   │
                   ▼
          ┌─────────────────┐
          │ viewer-request  │  CloudFront Function
          │                 │
          │ Extracts branch │
          │ from subdomain  │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ origin-request  │  Lambda@Edge
          │                 │
          │ /api/* → Lambda │
          │ /*     → S3     │
          └────────┬────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐     ┌───────────────┐
│    Lambda     │     │      S3       │
│ (Backend API) │     │  /{branch}/*  │
└───────────────┘     └───────────────┘
```

### Routing

1. **viewer-request** extracts subdomain and applies `subdomainMap`:
   - `myapp.com` → `main` (mapped from `""`)
   - `www.myapp.com` → `main` (mapped from `"www"`)
   - `feature--auth.myapp.com` → `feature--auth` (used as-is)
   - `main.myapp.com` → 404 (mapped to `null` = blocked)

2. **origin-request** routes by path:
   - `/api/*` → Backend Lambda (URL from SSM)
   - `/*` → S3 (`/{branch}/...`)

### SSM Parameter Store

Backend URLs are stored in SSM so Lambda@Edge can route dynamically:

```
/{project}/backend/{branch} → Lambda Function URL
```

When you deploy backend for `feature/auth`, it stores:
```
/myapp/backend/feature--auth → https://xxx.lambda-url.ap-northeast-2.on.aws/
```

Lambda@Edge reads this at runtime (cached 60s) to route API requests.

## CI/CD

Automatic deployment on push:
- Push to any branch → deploys backend + frontend for that branch
- Edge must be deployed manually (`npm run deploy:edge`)

### Setup

1. Run bootstrap to create IAM role for GitHub Actions:

```bash
npm run bootstrap -w edge
```

This creates an OIDC identity provider and IAM role in AWS. Copy the `RoleArn` from the output.

2. Add to GitHub repo (Settings → Secrets and variables → Actions):
   - Secret: `AWS_ROLE_ARN` = the role ARN from step 1

## Project Structure

```
├── tss.json              # Config (schema: tss.schema.json)
├── packages/
│   ├── backend/          # Hono API → Lambda
│   ├── frontend/         # Vite + React → S3
│   ├── edge/             # CloudFront + Lambda@Edge
│   └── shared/           # Shared utilities
```

## Branch Name Sanitization

Git branch names are sanitized to be subdomain-safe (RFC 1123):

| Branch | Subdomain |
|--------|-----------|
| `feature/auth` | `feature--auth` |
| `Feature_Branch` | `feature-branch` |
| `v1.2.3` | `v1-2-3` |

Rules: lowercase, `/` → `--`, non-alphanumeric → `-`, max 63 chars, no leading/trailing hyphens.

## AWS Resources

### Per backend deployment (`{project}-backend-{branch}`)
- Lambda Function + Alias + Function URL
- IAM Role
- SSM Parameter (`/{project}/backend/{branch}`)

### Per frontend deployment
- S3 objects under `/{branch}/*`

### Edge deployment (`{project}-edge`)
- CloudFront Distribution
- Lambda@Edge Function (us-east-1)
- ACM Certificate (wildcard)
- Route53 A Records (root + wildcard)
- S3 Bucket (frontend assets)

All resources tagged with `project` and `environment` (branch name).
