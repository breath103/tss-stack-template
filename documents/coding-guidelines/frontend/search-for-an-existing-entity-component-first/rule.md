---
topic: Components
order: 10
---

# When you are about to render a row, card or label for an entity (user, member, project, invitation, role, tool), run ./scripts/find_existing.ts first and reuse what it finds.

**Before you write JSX that draws an entity, or an i18n map of its names or states, run:**

```bash
./scripts/find_existing.ts InvitationRow      # the component you are about to write
./scripts/find_existing.ts tool               # or just the entity
./scripts/find_existing.ts "Not connected"    # a label you are about to add to an i18n file
```

It searches every component in `packages/frontend/src` and `modules/ui/src`, exported or
local to a file, in `routes/` as well as `components/`, and every `*.i18n.json`. Searching
`components/` alone is how the second copy gets written: most rows were built inside the first
route that needed them. `./scripts/recheck_guides.ts` runs the same search on what you added
and prints the matches under `ALREADY EXISTS` and `SAME LABEL ALREADY IN ANOTHER i18n FILE`.

## What to do with a match

- **It is in `components/<entity>/`** (`components/members/MemberListRow.tsx` draws a person
  or an invitee with a role and a ⋯ menu) → render it and fill its slots.
- **It is inside another route's folder**, exported or not → move it to `components/<entity>/`
  in this PR and render it from both pages
  (`frontend/domain-entity-presentation-lives-in-components-not-a-route-folder`).
- **Nothing matches** → build it in your route folder; it moves when a second page needs it.

## "Different enough" is not a reason

The existing row has a caret and yours has a status chip; it is a link and yours is not; it
is taller. Those are differences in what the page passes in, not in what the entity looks
like:

- a different right-hand side → a `trailing` slot on the existing component
- an extra line, or no secondary line → an optional prop
- clickable on one page only → an optional `onClick` / `href`
- denser or taller → a `size` or `shape` variant

Add the slot, prop or variant to the existing component (and its demo under `routes/design`
if it lives in `modules/ui`). A second component is right only when it draws a different
entity, and then its name says which: `BillingProjectInvitationRow`, not a second
`InvitationRow`. Lint (`local(one-component-per-entity)`) rejects one component name
declared in two files.

```tsx
// ❌ Wrong — a tool row already exists in routes/app/tools; this redraws it, and its labels
// routes/app/settings/tools/ConnectedToolRow.tsx
<div className="flex items-center gap-3 py-3">
  <ToolIcon toolId={tool.id} />
  <span>{tool.name}</span>
  <span>{connected ? i18n.status.connected : i18n.status.notConnected}</span>
</div>
// routes/app/settings/tools/ConnectedTools.i18n.json
"status": { "connected": "Connected", "notConnected": "Not connected" }
```

If the search listed a match and you still wrote a new component, say why in one line in your
report. "The layout differs" is not an answer.
