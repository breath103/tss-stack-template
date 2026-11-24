---
topic: Scripts and tests
order: 20
---

# When two scripts need the same helper, put it in scripts/lib/.

Shared helpers live in `scripts/lib/<domain>.ts`, beside the one-file-per-command scripts that
import them.

```
packages/backend/scripts/
├── db_start.ts
├── db_stop.ts
├── db_migrate.ts
└── lib/
    └── db_docker.ts
```
