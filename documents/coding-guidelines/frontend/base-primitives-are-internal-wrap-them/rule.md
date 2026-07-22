# Base primitives are internal — wrap them

Our UI has **two layers**, and the whole point is that app code only ever sees
the narrow one.

## Layer 1 — Base (`components/ui/base/`)

Raw shadcn output. Lowercase filenames (`tooltip.tsx`, `dialog.tsx`), Radix
primitives re-exported as loose compound parts (`Tooltip`, `TooltipTrigger`,
`TooltipContent`, …), open `className` on every slot. These are generated —
`shadcn add <x>` drops them here (see `components.json`, `aliases.ui`). **Do not
hand-edit them to add product behavior**; regenerating would wipe it. Treat them
as vendored.

Base primitives are **internal**. The only files allowed to import from
`components/ui/base/` are the wrappers that live directly in `components/ui/`.

## Layer 2 — Wrapper (`components/ui/*.tsx`)

The curated, deliberately-limited API the rest of the app uses. PascalCase
filenames (`Tooltip.tsx`, `Button.tsx`). Rules for a wrapper:

- **Closed prop unions, not open passthrough.** `variant: "normal" | "accent1"`,
  not `className="bg-whatever"`. Tokens are baked in so nobody reaches for an
  off-palette color.
- **One semantic shape.** If every call site does the same 3-part compound dance,
  collapse it. `<Tooltip label="…">{trigger}</Tooltip>` — never re-expose
  `TooltipTrigger` / `TooltipContent` to callers.
- **`className` is layout-only.** A wrapper may accept `className` for
  positioning/sizing/spacing (`max-w-xs`, grid placement, margin) — never for
  color, typography, or surface. Those come from props. This is a convention the
  reviewer enforces; the import gate below only enforces the layering.

## Why

An agent handed the raw compound primitive will invent a new structure every
time and paint arbitrary Tailwind onto it. Handed `<Tooltip label>`, there is
exactly one correct thing to type. The wrapper is the guardrail.

### Adding a new primitive

1. `shadcn add <name>` → lands in `ui/base/<name>.tsx` (vendored, don't touch).
2. Write `ui/<Name>.tsx` — the closed wrapper — importing from `./base/<name>`.
3. App code imports `@/components/ui/<Name>`. Never `@/components/ui/base/*`.
