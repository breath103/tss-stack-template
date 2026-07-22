# Use `useContextMenu` for action-row menus — don't hand-roll another popover

If the thing you're about to build is **a trigger + a vertical list of clickable action rows** (icon + label, checkmark toggle, plain label), you must use `useContextMenu` from `@/components/ui/ContextMenu`. Do NOT stand up a fresh `<Popover><PopoverContent>{rows}</PopoverContent></Popover>` with its own `useState(open)`, its own row `<button>` styling, and its own close-on-click plumbing.

Every hand-rolled version drifts: different row padding, different hover color, different focus outline, different close semantics. The hook owns the whole popover: anchoring (button box, right-click point, caret rect), destructive/disabled/checked/keyboard-shortcut row shapes, any-depth submenus with keyboard navigation, `divider`/`group` decorations, close-on-action, and a matching visual across the whole app.

**Rule of thumb:** if your PopoverContent is a `flex flex-col` of `<button>`s that each call an action and close, it's an action-row menu — use the hook.

## ✅ Do

```tsx
// Small fixed menu — declarative helper:
const menu = useContextMenu({
  align: "end",
  ...fromStaticItems(() => [
    { icon: Download, label: i18n.excel, onClick: onDownloadExcel },
    { icon: FileText, label: i18n.markdown, onClick: onDownloadMarkdown },
  ]),
});
return <ContextMenu contextMenu={menu} trigger={<Button variant="ghost" content="icon" icon={MoreHorizontal} />} />;

// Menu over domain values (lazy per level, one commit point) — raw triple:
const menu = useContextMenu<TaskRow, RowAction<TaskRow>>({
  items: (row, parent) => (parent === null ? rowActionItems(actions, row) : null),
  renderItem: (row, action) => rowActionSpec(action, row),
  onClick: (row, action) => action.run(row),
});
```

For right-click / per-row triggers, call `menu.open(target, e)` and mount one `<ContextMenuPortal contextMenu={menu} />`.

## ❌ Don't

```tsx
const [open, setOpen] = useState(false);
return (
  <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="ghost" content="icon" icon={MoreHorizontal} />
    </PopoverTrigger>
    <PopoverContent align="end" className="flex flex-col p-1">
      <button className="button-bg-overlay flex items-center gap-2 px-3 py-1.5" onClick={() => { onDownloadExcel(); setOpen(false); }}>
        <Download className="size-3.5" /> {i18n.excel}
      </button>
      <button className="button-bg-overlay flex items-center gap-2 px-3 py-1.5" onClick={() => { onDownloadMarkdown(); setOpen(false); }}>
        <FileText className="size-3.5" /> {i18n.markdown}
      </button>
    </PopoverContent>
  </Popover>
);
```

## Carve-outs — Popover is correct when the body is NOT an action-row list

- Form / editor (`LinkPopover`, `EditableSchedule`, `VisualizationSettings`, filter editors)
- Combobox — search input + keyboard-nav'd result list (`PersonPicker`, `ObjectiveSearchSelect`, `TaskBreadcrumb`, `ObjectiveCell`, `Blocks`, `RelationTaskSearch`)
- Date / calendar picker
- Horizontal button row (Cancel + Confirm)
- Any surface where a row needs a custom leading element the menu doesn't model (a `MenuRowSpec` `custom` row usually covers it)
- Route-link navigation with active-state styling (see `TopNav.tsx` mobile menu — `<Link>` rows, not action-fire rows)

If your carve-out is really "action-row list plus one extra thing," add that extra thing to `MenuRowSpec` in `ContextMenu.tsx` — don't fork the pattern.
