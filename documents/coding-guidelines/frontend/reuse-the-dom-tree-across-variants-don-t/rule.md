# Reuse the DOM tree across variants — don't branch into separate subtrees

When a component has two display modes (collapsed/expanded, compact/detailed, loading/loaded), don't return two entirely different JSX trees from the same component. Keep one layout, conditionally render the *parts* that actually differ, and let React reuse the DOM nodes.

Separate subtrees:
- Break animation / focus continuity (React unmounts and remounts everything).
- Duplicate shared markup — every future change has to be made twice.
- Often come with a private sub-component extracted just to dedupe the pieces you copied.

```tsx
// ❌ Wrong — two fully separate branches, same button rendered twice
function BrandHeader({ collapsed, onToggle }: Props) {
  if (collapsed) return <div className="justify-center"><ToggleButton onClick={onToggle} /></div>;
  return <div className="justify-between"><Brand /><ToggleButton onClick={onToggle} /></div>;
}
```

```tsx
// ✅ Correct — one tree, conditionally renders what actually differs.
function BrandHeader({ collapsed, onToggle }: Props) {
  return (
    <div className={cn("flex", collapsed ? "justify-center" : "justify-between")}>
      {!collapsed && <Brand />}
      <ToggleButton onClick={onToggle} />
    </div>
  );
}
```

If you catch yourself writing `if (state) return <A/>; return <B/>;` at the top of a render, ask whether the two trees are actually different *shapes* or just the same shape with different props.
