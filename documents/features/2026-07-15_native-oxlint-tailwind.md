# Native oxlint Tailwind plugin

## Summary

Replace `eslint-plugin-better-tailwindcss` with **`oxlint-tailwindcss`**, a plugin built natively
against the `@oxlint/plugins` API. Tailwind coverage is unchanged; the last package carrying the
`eslint` name is gone.

## Motivation

The [ESLint → oxlint migration](./2026-07-14_eslint-to-oxlint.md) removed ESLint but kept
`eslint-plugin-better-tailwindcss`, loaded through oxlint's `jsPlugins` bridge. It worked — no ESLint
was installed, and the plugin declares `eslint` as an *optional* peer — but it left an
`eslint`-prefixed dependency in `packages/frontend/package.json`, which reads as an unmigrated
leftover to anyone auditing the repo. A native plugin now exists, so there is no reason to keep it.

## Changes

- **Dep:** `eslint-plugin-better-tailwindcss` → `oxlint-tailwindcss` (frontend devDependency).
  The new plugin has **no** peer dependencies; its only deps are `tailwindcss` / `@tailwindcss/node`.
- **Config** (`packages/frontend/.oxlintrc.json`): `jsPlugins` becomes the bare specifier
  `["oxlint-tailwindcss"]`; the settings key moves from `better-tailwindcss` to `tailwindcss`;
  the rule prefix moves from `better-tailwindcss/` to `tailwindcss/`.
- **Stale `node_modules`:** the previous migration left empty `@eslint`, `@eslint-community`, and
  `@typescript-eslint` directories on disk (contents removed, dirs never swept). Cleared.
- **Docs:** `CLAUDE.md`, `documents/coding-guidelines/frontend.md`, and the `lint.ts` header comment
  all credited **Biome** with Tailwind class ordering. That was never true — Biome's linter is
  `"enabled": false` and its assist only runs `organizeImports`. Corrected to credit oxlint.

## Rule mapping

| before (`better-tailwindcss/…`) | after (`tailwindcss/…`) |
| --- | --- |
| `enforce-consistent-class-order` | `enforce-sort-order` |
| `enforce-consistent-line-wrapping` (off) | `enforce-consistent-line-wrapping` (off) |
| `no-deprecated-classes` | `no-deprecated-classes` |
| `no-duplicate-classes` | `no-duplicate-classes` |
| `no-unnecessary-whitespace` | `no-unnecessary-whitespace` |
| `enforce-canonical-classes` | `enforce-canonical` |
| `no-conflicting-classes` | `no-conflicting-classes` |
| `no-unknown-classes` | `no-unknown-classes` |

One option was dropped: `no-unknown-classes` previously passed
`{ detectComponentClasses: true }`, which the native plugin does not expose. Severity is unchanged
(`warn`) and the rule still fires on unknown classes — see Risks.

## Requirements

- Tailwind **v4** only (repo is on 4.1.18). The plugin resolves the real Tailwind context from
  `settings.tailwindcss.entryPoint` (`./src/global.css`), so it validates against the actual
  compiled class list rather than a static list.
- Node >= 20 (CI runs 24).

## Verification

Lint is the observable surface. A probe component with a deliberately bad class string:

```tsx
<div className="text-red-500 flex p-4 blahblah-unknown-class">probe</div>
```

run through the real `./packages/frontend/scripts/lint.ts` entry point produces:

```
warning tailwindcss(no-unknown-classes): "blahblah-unknown-class" is not a valid Tailwind class.
warning tailwindcss(enforce-sort-order): Tailwind classes are not in the recommended order.
```

Both rules fire and the entry point resolves (no "entry point not found" warning). Full
`./scripts/lint` and `./scripts/knip.ts` pass clean across all packages; the existing 17 frontend
files produce zero new violations, so the swap required no code reflow.

Note that a *silent* pass proves nothing here — zero output is equally consistent with "plugin
loaded, no violations" and "plugin never loaded." The probe is what distinguishes them. Keep using
one when touching this config.

## Risks

- **`jsPlugins` is still alpha** (oxlint's docs: "not subject to semver"). This swap doesn't change
  that exposure — it's the same bridge as before, just a native-built plugin on the other end.
- **`oxlint-tailwindcss` is young** (first published 2026-03, ~70k weekly downloads at time of
  writing) versus the more established `better-tailwindcss`. Mitigation: rules map 1:1, so reverting
  is a config-prefix change plus a dep swap.
- **`detectComponentClasses` is gone.** The old config used it to look through component-level class
  props. If unknown-class detection turns out to miss cases it used to catch, that's the likely
  cause.
