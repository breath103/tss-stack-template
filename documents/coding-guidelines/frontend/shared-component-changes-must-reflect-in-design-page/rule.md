# Reflect shared-component changes in /design

Any change to `packages/frontend/src/components/ui/*` — new variant, size,
prop, or visual state — lands in the matching demo under
`packages/frontend/src/routes/design/` in the same commit. New primitive →
new `<Name>Demo.tsx` mounted from `DesignPage.tsx`.

`/design` is the only place we eyeball every primitive across themes and
accents. Changes that skip it are invisible to design QA, to dark-mode
audits, and to the next engineer looking for "what does X look like?"

Exempt: pure bugfixes with no new public surface, and non-visual props
(`data-testid`, ARIA passthrough).
