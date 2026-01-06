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
│   │   │   ├── edge-router.ts  # Request routing logic
│   │   │   └── stack.ts        # CDK stack definition
│   │   └── scripts/deploy.ts   # Build + deploy
│   └── frontend/             # Vite + React SPA
│       ├── src/main.tsx
│       └── vite.config.ts    # Dev proxy to backend
```

## Configuration

`tss.json`:
```json
{
  "project": "myapp",           // Project name (used in stack names, SSM paths)
  "backendRegion": "ap-northeast-2",  // AWS region for backend Lambda
  "domain": "example.com",      // Your domain
  "hostedZoneId": "Z1234567890" // Route53 hosted zone ID
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

- [ ] Frontend deployment to S3 + CloudFront
- [ ] Type-safe API client generation (frontend imports backend types)
- [ ] GitHub Actions workflow for CI/CD
- [ ] `destroy` command for cleanup
