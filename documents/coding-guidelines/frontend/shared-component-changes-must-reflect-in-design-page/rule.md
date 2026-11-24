---
topic: Components
order: 80
---

# When you add a variant, size or prop to a shared UI component, add its demo under routes/design in the same commit.

Any change to a shared primitive (`modules/ui/src/components/*`, or
`packages/frontend/src/components/ui/*`) that adds a variant, size, prop or visual state lands in
the matching demo under `packages/frontend/src/routes/design/` in the same commit. A new
primitive gets a new `<Name>Demo.tsx` mounted from `DesignPage.tsx`.

`/design` is the only place every primitive is seen across themes and accents. A change that
skips it is invisible to design QA, to dark-mode audits, and to the next engineer asking what X
looks like.

Exempt: bug fixes with no new public surface, and non-visual props (`data-testid`, ARIA
passthrough).
