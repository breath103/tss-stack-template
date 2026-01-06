# TSS Stack Template

Type-Safe Serverless Stack for deploying full-stack TypeScript apps on AWS.

## Why

If you want a simple web app (no SSR) on your own AWS infrastructure:

- **Type-safe API calls** - Frontend imports backend types directly. No codegen, no runtime overhead.
- **Branch previews** - Deploy `feature/auth` branch to `feature--auth.yourdomain.com`
- **Single domain** - Backend API and frontend served from same domain. No CORS.
- **Your AWS account** - No vendor lock-in. You own everything.

## Quick Start

### 1. Configure

Edit `tss.json`:

```json
{
  "project": "myapp",
  "backendRegion": "ap-northeast-2",
  "domain": "myapp.com",
  "hostedZoneId": "Z1234567890"
}
```

`hostedZoneId` is from Route53. Create a hosted zone for your domain first.

### 2. Deploy

```bash
# Edge (CloudFront + Lambda@Edge) - run once
npm run deploy:edge

# Backend
npm run deploy:backend -- --name=main

# Frontend
npm run deploy:frontend -- --name=main
```

### 3. Dev

```bash
npm run dev
```

Runs backend on `:3001`, frontend on `:5173` with proxy to backend.

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

### How routing works

1. **viewer-request** extracts branch from subdomain (`feature--auth.myapp.com` → `feature--auth`)
2. **origin-request** checks the path:
   - `/api/*` → Looks up Lambda URL from SSM, routes to backend
   - `/*` → Prepends branch to path, routes to S3 (`/dashboard` → `/feature--auth/dashboard`)

### SSM Parameter Store

Backend URLs are stored in SSM so Lambda@Edge can route dynamically:

```
/{project}/backend/{branch} → Lambda Function URL
/{project}/frontend/bucket  → S3 bucket name
```

When you deploy backend for `feature/auth`, it stores:
```
/myapp/backend/feature--auth → https://xxx.lambda-url.ap-northeast-2.on.aws/
```

Lambda@Edge reads this at runtime (cached 60s) to route API requests.

## Project Structure

```
├── tss.json              # Config
├── packages/
│   ├── backend/          # Hono API → Lambda
│   ├── frontend/         # Vite + React → S3
│   ├── edge/             # CloudFront + Lambda@Edge
│   └── shared/           # Shared utilities
```
