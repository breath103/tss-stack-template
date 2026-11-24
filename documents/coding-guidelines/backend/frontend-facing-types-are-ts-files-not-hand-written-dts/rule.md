---
topic: Types and schemas
order: 90
---

# When the frontend imports a backend type, declare it in a .ts file, not a hand-written .d.ts.

The frontend imports backend types through `@backend/*`, which resolves to
`packages/backend/dist/*` — the declarations emitted by
`tsc --emitDeclarationOnly` (see `packages/frontend/tsconfig.json` `paths`).

**`tsc` does not copy a hand-authored `src/**/*.d.ts` input into `outDir`.** It
treats an input `.d.ts` as already-emitted and skips it, so
`packages/backend/dist/**/foo.d.ts` never appears and every frontend
`import type { X } from "@backend/.../foo"` fails to resolve. The backend's own
typecheck stays green (it reads the source `.d.ts` directly) — the break only
shows up in the frontend build, which is easy to miss locally.

Author shared types as **normal `.ts` files that export only types**. A file with
just `export interface` / `export type` / `z.infer` compiles to empty JS and
emits a real `dist/**/foo.d.ts` the frontend can import. This is the convention
`types/database.ts` already follows (it's a `.ts` of pure types, imported as
`@backend/types/database`).

```ts
// ✅ src/tools/rows.ts — a .ts of pure types → emits dist/tools/rows.d.ts
export type OrganizationTool = { /* … */ };

// ✅ src/tools/calendar.ts — schema is the source of truth, type is inferred
export const calendarGlobalConfigSchema = z.object({ baseUrl: z.string() });
export type CalendarToolGlobalConfig = z.infer<typeof calendarGlobalConfigSchema>;
```

```ts
// ❌ src/tools/rows.d.ts — hand-written .d.ts input.
// tsc --emitDeclarationOnly does NOT copy it to dist/; @backend/tools/rows 404s
// from the frontend even though the backend typechecks fine.
export type OrganizationTool = { /* … */ };
```

A design doc sketching a module as `foo.d.ts` means "these are types, not runtime
code" — implement it as a pure-type `.ts`, not a literal `.d.ts` input.
