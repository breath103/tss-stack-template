# Replace ESLint with oxlint + Biome

## Summary

Remove ESLint entirely from the repo and replace it with two Rust-based tools:

- **oxlint** — correctness linting (ESLint core recommended, typescript-eslint, unicorn, react-hooks) **plus type-aware rules** via `--type-aware` (backed by `oxlint-tsgolint`). It also runs **`eslint-plugin-better-tailwindcss`** as an oxlint **JS plugin** (`jsPlugins`) — so Tailwind class ordering **and unknown-class detection** are preserved without ESLint.
- **Biome** — code **formatting** (replaces `@stylistic/*`) and **import organizing** (replaces `simple-import-sort`).

Net result: the entire `eslint` + `typescript-eslint` + `@stylistic` + plugin dependency graph and the ESLint content-cache machinery are gone.

## Motivation

- oxlint is orders of magnitude faster than ESLint; Biome's formatter/organizer is likewise near-instant.
- Drops a large, slow dependency tree (`typescript-eslint`, `@eslint/js`, `@stylistic/eslint-plugin`, four plugins) in favor of two binaries.
- Simpler, single root config per tool instead of four flat-config files + a shared factory.

## Why two tools

oxlint is a **linter, not a formatter**, and has no Tailwind or `simple-import-sort` equivalent. The owner chose **Biome** to cover those gaps (formatting, import sort, Tailwind), and to **keep** the type-aware correctness rules via oxlint `--type-aware`. So oxlint owns correctness; Biome owns formatting/organizing.

## Rule mapping

| Current ESLint rule / preset | New home |
| --- | --- |
| `eslint.configs.recommended` | oxlint `correctness` (default on) |
| `typescript-eslint` recommended(-TypeChecked) | oxlint `typescript` plugin + `--type-aware`, incl. the `no-unsafe-*` family (see below) |
| `@typescript-eslint/no-unnecessary-condition` | oxlint type-aware `no-unnecessary-condition` |
| `@typescript-eslint/require-await` | oxlint type-aware `require-await` |
| `no-floating-promises` (via TypeChecked; off in backend tests) | oxlint type-aware `no-floating-promises` (override off for `**/__tests__/**`) |
| `@typescript-eslint/no-explicit-any` (warn) | oxlint `typescript/no-explicit-any` (warn) |
| `@typescript-eslint/no-inferrable-types` | oxlint `typescript/no-inferrable-types` |
| `@stylistic/*` (indent 2, double quotes, semi, 1tbs, member-delimiter-style, comma-spacing, `quotes` avoidEscape) | **Biome formatter** (`indentWidth: 2`, `quoteStyle: double`, `semicolons: always`, `trailingCommas`) |
| `simple-import-sort/imports` + `/exports` (custom groups) | **Biome** assist `source.organizeImports` (grouping differs — see Deltas) |
| `unicorn/prefer-node-protocol` (off for edge `src/**`) | oxlint `unicorn/prefer-node-protocol` (override off for edge src) |
| `react-hooks` recommended | oxlint `react` plugin react-hooks rules |
| `@typescript-eslint/no-restricted-imports` (@backend type-only) | oxlint `no-restricted-imports` w/ `allowTypeImports` |
| `better-tailwindcss` recommended + `no-unknown-classes` (warn) | **`eslint-plugin-better-tailwindcss` run as an oxlint `jsPlugins` entry** — same rules (ordering, no-conflicting-classes, **no-unknown-classes**), same `entryPoint` setting, no ESLint |
| `eslint-plugin-react-refresh` (dep present, unused in config) | dropped |

## Key files

**Delete:** `packages/{frontend,backend,edge}/eslint.config.ts`, `e2e/eslint.config.ts`.

**Add:**
- `.oxlintrc.base.json` (root) — edge-safe shared rules (correctness, no-explicit-any, no-inferrable-types, require-await, prefer-node-protocol).
- `.oxlintrc.json` (root) — extends base, adds the type-aware set (`no-unnecessary-condition`, `no-floating-promises`, `no-unsafe-*` family).
- `packages/{backend,frontend,edge}/.oxlintrc.json`, `e2e/.oxlintrc.json` — per-tree extends + overrides (backend: tests `no-floating-promises` off; frontend: react-hooks, `no-restricted-imports`, better-tailwindcss jsPlugin; edge: base-only, node-protocol off for `src/**`, `no-floating-promises` off).
- `biome.json` (root) — formatter + assist (organize imports); linter disabled (oxlint owns correctness, better-tailwindcss owns Tailwind).

**Rewrite:** `packages/{frontend,backend}/scripts/lint.ts`, `scripts/e2e_lint.ts` — run `oxlint --type-aware <dirs>` then `biome check <dirs>` (with `--write` when `--fix`/`--no-cache` is passed; drop the ESLint `--cache` logic since oxlint/Biome are fast enough that caching isn't needed). `scripts/lint` (concurrently aggregator) stays as-is (calls the same three scripts). The pre-commit hook (`.husky/pre-commit`) already calls `lint.ts --fix`; keep that contract working (oxlint `--fix` + `biome check --write`).

**Edit deps:** remove all `eslint*`, `typescript-eslint`, `@eslint/js`, `@stylistic/eslint-plugin`, plugin devDeps from `packages/{frontend,backend,edge}/package.json`; add `oxlint`, `oxlint-tsgolint`, `@biomejs/biome` to root `devDependencies`.

**Docs:** `documents/coding-guidelines/{backend,frontend}.md` ("Run ESLint with --fix" → oxlint/biome), `CLAUDE.md` (ESLint content-cache paragraph → new tools).

**CI:** `.github/workflows/deploy.yml` lint commands unchanged in shape (they invoke the same script paths) — behavior swaps underneath.

## Deltas (accepted coverage changes)

1. **Import grouping** — `simple-import-sort`'s custom regex groups (`node:` / external / `@scoped` / `@/` / relative, blank-line separated) become Biome's import-organizer grouping. Order is close but not byte-identical; the whole tree gets reflowed once.
2. **Formatting reflow** — Biome's formatter output won't be byte-identical to `@stylistic`'s. Expect a one-time whole-repo reformat commit.

Tailwind coverage (ordering + **unknown-class detection**) is fully preserved — `eslint-plugin-better-tailwindcss` runs as an oxlint `jsPlugins` entry (the plugin declares `oxlint` as an official optional peer), so no coverage is lost there.

## Risks

- **`--type-aware` is experimental** (oxlint 1.74). Verified locally: `no-floating-promises`, `no-unnecessary-condition`, `require-await` all fire; `no-unnecessary-condition` needs `allowConstantLoopConditions: true` to match the old config's `while (true)` allowance.
- **`jsPlugins` is alpha** (oxlint's docs: "not subject to semver"). The Tailwind detection rides on it. If a future oxlint bump breaks the JS-plugin bridge, the fallback is to pin oxlint or move the Tailwind rules to a thin Biome/editor path. CI runs Node 24, which the bridge requires.
- **Whole-repo reflow** — first run touches many files (formatting + import order + one Tailwind class re-sort). Expected; a mechanical diff separate from config.
- **Config is layered** — `.oxlintrc.base.json` holds the rules shared with edge (which used the non-type-checked `recommended` preset); `.oxlintrc.json` extends it and adds the type-aware set — `no-unnecessary-condition`, `no-floating-promises`, and the `no-unsafe-*` family (`no-unsafe-argument/assignment/call/member-access/return`, `no-unsafe-enum-comparison`) at `error`, matching `recommendedTypeChecked`. Backend/frontend/e2e extend the type-checked config; edge extends the base only (and turns `no-floating-promises` off, since `--type-aware` enables it by default). Enabling the family surfaced zero net-new violations — the one `any`-by-design site (`hono-adapter`) already carries an `oxlint-disable`.

## Verification

Lint *is* the observable surface. Run the rewritten `scripts/lint` across backend/frontend/e2e, confirm oxlint (with type-aware) + Biome run clean, and run `build:types` for all packages to confirm nothing structural broke. No runtime/UI surface.
