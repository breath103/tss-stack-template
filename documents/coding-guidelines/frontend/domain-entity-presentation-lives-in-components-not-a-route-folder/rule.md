---
topic: Components
order: 20
---

# When two routes render the same entity, move its component and label dict to components/<entity>/ and update the importers.

A component that draws an entity and sits inside another route's folder, exported or not
(`ToolsListRow` in `routes/app/tools/ToolsLayout.tsx`, the invitation row in
`routes/billing/$billingAccountId/projects/PolicySection.tsx`, the `row.connected` /
`row.notConnected` labels in `routes/app/tools/Tools.i18n.json`), moves to
`components/<entity>/` in the PR that needs it a second time, with its i18n keys in a dict
beside it. Update the importers, and render it from both pages. Finding it is
`frontend/search-for-an-existing-entity-component-first`.

```tsx
// ✅ Correct — the row moved to components/tools/ with its labels; both pages render it
// components/tools/ToolRow.tsx + components/tools/ToolRow.i18n.json
<ToolRow toolId={tool.id} trailing={<CaretRightIcon />} onClick={openTool} />   // routes/app/tools
<ToolRow toolId={tool.id} trailing={<DisconnectButton toolId={tool.id} />} />   // routes/app/settings/tools
```

## What the shared component holds

```
components/<entity>/       # how the entity LOOKS: shared, route-agnostic
  <Entity>Row.tsx          #   icon + name + status, and a `trailing` slot the caller fills
  <Entity>Row.i18n.json    #   ONE dict of its names and states, not one per page
routes/…/<page>/           # what THIS page does with it: data, actions, gating
```

It is presentation only: no fetching, no mutations, no role gates. Pages differ by what they
pass into its slots, never by redrawing the entity.
