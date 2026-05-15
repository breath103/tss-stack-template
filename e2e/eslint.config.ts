// Flat-config base-path scoping requires a config file next to the source
// being linted, so this can't live in packages/backend/. Reuses backend's
// rule set via `createEslintConfig`; only `tsconfigRootDir` differs.
import { createEslintConfig } from "../packages/backend/eslint.config.ts";

export default createEslintConfig({ tsconfigRootDir: import.meta.dirname });
