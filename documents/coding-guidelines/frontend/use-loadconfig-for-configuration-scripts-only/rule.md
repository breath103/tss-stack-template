# Use loadConfig() for configuration (scripts only)

In scripts (e.g., `scripts/dev.ts`, `scripts/deploy.ts`), use `loadConfig()` to read `tss.json`:

```typescript
import { loadConfig } from "shared/config";
const config = loadConfig();
```

This does NOT apply to runtime code (`src/`) which runs in the browser and cannot access the filesystem.
