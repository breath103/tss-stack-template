---
topic: Scripts and tests
order: 30
---

# When a script needs a value from tss.json, call loadConfig(); don't read the file yourself.

In scripts (e.g., `scripts/dev.ts`, `scripts/deploy.ts`, `scripts/build.ts`), use `loadConfig()` to read `tss.json`:

```typescript
import { loadConfig } from "shared/config";
const config = loadConfig();
```

This does NOT apply to runtime code (`src/`) which runs in Lambda and may not have access to `tss.json`.
