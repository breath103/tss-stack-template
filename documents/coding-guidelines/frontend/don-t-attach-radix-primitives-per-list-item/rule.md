# Don't attach Radix primitives per list item — hoist to list level

Each Radix `ContextMenu.Root`, `Tooltip.Root`, `DropdownMenu.Root`, `Popover.Root` attaches its own event listeners and renders its own Trigger instance. Putting one per row inside a list of hundreds or thousands of items means hundreds of listener sets for no reason.

For list-wide interactions (right-click, hover tooltip, etc.), keep **one** shared menu/tooltip at the list level. Each row just forwards its native DOM event (`onContextMenu`, `onMouseEnter`) up to the list, which tracks which row triggered it and opens the single shared surface.

```tsx
// ❌ Wrong — Radix Root per row; O(rows) listener sets and Triggers
export function MemoryRow({ memory }: { memory: Memory }) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <Link>...</Link>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content>...</ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
```

```tsx
// ✅ Correct — single shared menu, rows just forward the native event
export function MemoryList({ memories }: { memories: Memory[] }) {
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  return (
    <>
      {memories.map((m) => (
        <MemoryRow
          key={m.id}
          memory={m}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ id: m.id, x: e.clientX, y: e.clientY });
          }}
        />
      ))}
      <MemoryContextMenu state={menu} onClose={() => setMenu(null)} />
    </>
  );
}
```

Same principle for tooltip on list rows, hover cards on rows, drag handles — one shared surface driven by list-level state.
