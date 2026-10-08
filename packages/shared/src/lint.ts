import { spawnSync } from "node:child_process";

import { resolveBin } from "./cli-utils.js";

/**
 * Run the repo's linters over `targets` (relative to `cwd`):
 *   - oxlint (correctness + type-aware) reads the nearest `.oxlintrc.json`
 *   - biome check (formatting, import order)
 *
 * `--fix` applies fixes from both (biome uses `--write --unsafe`). `--no-cache`
 * is accepted for backwards compatibility and ignored — oxlint/biome are fast
 * enough not to cache. Exits the process non-zero if either linter errors.
 */
export function runLint({ cwd, targets, args }: { cwd: string; targets: string[]; args: string[] }): never {
  const fix = args.includes("--fix");
  const passthrough = args.filter(a => a !== "--fix" && a !== "--no-cache");

  const oxlint = spawnSync(resolveBin("oxlint", cwd), [...targets, ...(fix ? ["--fix"] : []), ...passthrough], {
    stdio: "inherit",
    cwd,
  });
  if (oxlint.error) throw oxlint.error;

  const biome = spawnSync(resolveBin("biome", cwd), ["check", ...(fix ? ["--write", "--unsafe"] : []), ...targets], {
    stdio: "inherit",
    cwd,
  });
  if (biome.error) throw biome.error;

  process.exit((oxlint.status ?? 1) || (biome.status ?? 1));
}
