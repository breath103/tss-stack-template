# Project Instructions

See `documents/coding-guidelines/` for coding standards:
- `backend.md` - Backend (packages/backend)
- `frontend.md` - Frontend (packages/frontend)

## npm Workspace Commands

This monorepo uses npm workspaces. Commands can be run from the root directory.

### Root-level scripts (run from root)

```bash
npm run dev              # Start all dev servers (frontend, backend, edge proxy)
npm run deploy:backend   # Deploy backend to AWS
npm run deploy:frontend  # Deploy frontend to AWS
npm run deploy:edge      # Deploy edge (CloudFront) to AWS
npm run lint             # Run linters across packages
npm run test             # Run tests
```

### Running scripts in specific packages

Use `-w @app/<package>` to target a specific workspace:

```bash
npm run <script> -w @app/<package>
```

Available packages:
- `@app/backend` - Backend API (Hono on Lambda)
- `@app/frontend` - Frontend (React/Vite)
- `@app/edge` - Edge proxy (CloudFront/Lambda@Edge)
- `@app/shared` - Shared utilities and types

### Examples

```bash
# Run backend dev server only
npm run dev -w @app/backend

# Run frontend dev server only
npm run dev -w @app/frontend

# Deploy backend with arguments
npm run deploy -w @app/backend -- --hotswap

# Run tests in shared package
npm test -w @app/shared

# Install a package to a specific workspace
npm install <package> -w @app/backend
npm install -D <package> -w @app/frontend  # as devDependency
```
