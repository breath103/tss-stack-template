# 100-line component limit — break it down

If any component file is over ~100 lines, stop and ask: *why is this so complicated, and how can I break it into smaller, more obvious pieces?* A component that won't fit on a screen is a component nobody reads top-to-bottom — it's where inline duplication, tangled state, and hidden coupling accumulate.

Common ways a component balloons past the limit:

- **Inline sub-blocks** — headers, toolbars, empty states, loading skeletons, list items built inline. Extract each into a named component (`Toolbar`, `EmptyState`, `LoadingState`, `FooRow`) colocated in the same file or next to it.
- **Repeated UI patterns** — the same icon-button shell, the same form row, the same pill rendered in three spots. Lift into a primitive.
- **Branching on type / state** — a single function returning different JSX based on a discriminated union. Split each branch into its own component dispatched by a tiny `switch`.
- **Mixed concerns** — data fetching, form state, and presentation in one body. Separate into a loader/container component that fetches, then a presenter component that renders.

The rule isn't "exactly 100 lines" — it's *treat 100 as the smell threshold.* Sometimes the right component really is 130 lines and decomposing would hurt readability. Usually it isn't. Default to splitting and only keep it big if you can defend why.

## How to split: `Foo.tsx` + `Foo/` children

When a file grows several components, keep the main/exported component as
`Foo.tsx` and move its private sub-components into a sibling folder of the same
name, one component per file — imported directly (no barrel `index`, so the
listing sorts `Foo.tsx` right next to `Foo/`):

```
objectives/
  ObjectiveDetailSidebar.tsx          # main component, imports its children
  ObjectiveDetailSidebar/
    LinkedTasks.tsx
    Blocks.tsx
    LeafTracking.tsx
    Field.tsx
    IconButton.tsx
```

For components that already belong to a route folder, a flat sibling file in the
same directory is equally fine — match what's already there.

## The programmatic gate (`check.sh`)

The `~100` figure is a **soft smell threshold for humans**, not a hard gate — a
file that colocates a *few* small components is *good*, not a violation. The
gate fails on two distinct ways a file gets too big:

1. **One oversized component** — the **largest single top-level component** in a
   `.tsx` (its line span, decl to next decl) exceeds **150 lines**. This ignores
   total file lines, so a well-factored file of small components passes #1.
2. **A long file stuffed with many components** — total file lines **>= 200**
   AND **>= 8** top-level components. Check #1 is structurally blind to this:
   every component is individually small, so the span check passes, yet the file
   is really a *module* pretending to be a component file. This is the
   "`Foo.tsx` + `Foo/` folder" case above — once a long file holds that many
   components, colocation stops helping and they belong in a sibling folder, one
   per file. (The 200-line floor keeps small shadcn primitive bundles — e.g.
   `dialog.tsx`/`command.tsx`, 9–10 tiny components in under 190 lines — out of
   scope; those are genuinely fine colocated.)

Stay under ~100 per component by habit; the gate catches both the single-giant
case and the many-components-in-one-long-file case.
