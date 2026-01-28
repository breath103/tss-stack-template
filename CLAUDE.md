# Project Instructions

See `documents/coding-guidelines/` for coding standards:
- `backend.md` - Backend (packages/backend)
- `frontend.md` - Frontend (packages/frontend)

## npm Workspace Commands

This monorepo uses npm workspaces. Commands can be run from the root directory.

### Root-level scripts (run from root)

```bash
npm run dev   # Start all dev servers (frontend, backend, edge proxy)
npm run lint  # Run linters across packages
```

### Running scripts in specific packages

Use `-w <package>` to target a specific workspace:

```bash
npm run <script> -w <package>
```

Available packages:
- `backend` - Backend API (Hono on Lambda)
- `frontend` - Frontend (React/Vite)
- `edge` - Edge proxy (CloudFront/Lambda@Edge)
- `shared` - Shared utilities and types

### Examples

```bash
# Run backend dev server only
npm run dev -w backend

# Run frontend dev server only
npm run dev -w frontend

# Deploy backend with arguments
npm run deploy -w backend -- --hotswap

# Run tests in shared package
npm test -w shared

# Install a package to a specific workspace
npm install <package> -w backend
npm install -D <package> -w frontend  # as devDependency
```
