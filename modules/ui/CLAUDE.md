# Editing `@modules/ui` (the shared UI system)

This is the **shared, source-shipped UI component library** for the stack. It
lives in the template and is distributed to downstream apps by **`/tss-update-template`**
(a git merge from the template remote) — NOT via npm. Every app renders the same
components and reskins by overriding CSS design tokens in its own stylesheet.
That model dictates the rules below; they are not the same as an app package's.

## Hard constraints

1. **Source-shipped, no build step.** No bundler, no `dist`, no emit —
   `typecheck` is `tsc --noEmit`. Consumers import the `.tsx` through the `@ui`
   alias (`@ui/* → modules/ui/src/*`) and their bundler compiles it. Don't add a
   build pipeline or a `main`/`module` entry.

2. **Pure CSS-variable theming.** `src/theme/theme.css` ships *neutral* defaults
   (system fonts, the default palette) and is reskinned entirely by token
   overrides downstream. So:
   - **Never hardcode brand values** (specific fonts, brand hex/oklch, a fixed
     radius) in a component or theme default. A brand lives in the *consuming
     app's* stylesheet, not here.
   - A new visual knob = **a new token** in `theme.css` (seed → derived),
     consumed via a Tailwind class — not an inline style or magic literal.
   - No TSX-level theming props for look-and-feel a token could express.

3. **`theme.css` self-sources.** It contains `@source ".."` (its own components),
   resolved relative to itself — so a consumer only `@import`s it and needs **no
   `@source` line** of their own. Keep that directive when editing the header.

## Imports & structure

- **Internal imports are always relative** (`../lib/utils`, `./Skeleton`). Never
  `@/…`, never `@ui/…`, never self-import the package name — the module ships
  source and resolves by relative path in the consumer's tree.
- **No project/domain concepts.** This library is generic. Anything encoding a
  specific app's model (a "person", a "task") does NOT belong here — it takes
  data via props/generics. (This is why the `/design` showcase in the template
  frontend dropped the app-coupled Picker demo.)
- Layout: `src/components/`, `src/hooks/`, `src/i18n/`, `src/lib/`, `src/theme/`.

## Styling specifics

- **CSS modules** must start with `@reference "../theme/reference.css";` so
  `@apply` resolves without emitting duplicate CSS. `reference.css` is also the
  oxlint-tailwindcss `entryPoint` — the source of truth for valid classes.
- **Never audit a Tailwind class by hand** — `npm run lint` (oxlint-tailwindcss)
  gates unknown/non-canonical classes and order as errors. Hover/active/selected
  on a clickable surface is `button-bg-overlay` (or `button-bg-surface1`/`2`),
  not stock shadcn `hover:bg-*`.
- **Icons: Phosphor only** (`src/components/icon.ts` re-exports the types;
  components type icon props as `IconComponent`).

## i18n

Strings live in a colocated `Foo.i18n.json` consumed with `useI18n(dict)` from
`src/i18n/I18nContext`. The i18n-aware primitives require the app to mount one
`<I18nProvider>` (from `@ui/i18n/I18nContext`) at its root.

## Comments

Default to **zero new comments**. Write one only for a constraint the code can't
express. Don't restate what the next line does or justify a change to a reviewer.

## Checks

```bash
npm run -w @modules/ui typecheck   # tsc --noEmit
npm run -w @modules/ui lint        # oxlint (+ tailwind + local rules) then biome
```

Lint uses the repo's local oxlint plugin (`packages/shared/src/oxlint-rules`,
e.g. `local/no-single-use-type`) — the same one the rest of the stack uses.
