---
topic: Components
order: 40
---

# When rows in a list have a ⋯ menu, call useContextMenu once in the list parent with one ContextMenuPortal; rows call menu.open().

A list of rows shares ONE menu: the parent owns it, a row only asks for it to open.

When every row of a list has a ⋯ button (or a right-click menu), call `useContextMenu` **once, in the component that renders the list**, and mount **one** `<ContextMenuPortal>` there. A row receives a callback and calls `menu.open(target, anchor)` with itself as the target. The row component never imports `useContextMenu`, `ContextMenu` or `ContextMenuPortal`.

```tsx
// ❌ Wrong — a hook call, a popover root and a portal per row. 200 rows mount 200 menus,
// and each row re-declares the same items.
function MemberRow({ member }: { member: ProjectMembershipRow }) {
  const menu = useContextMenu({
    align: "end",
    ...fromStaticItems(() => [{ label: i18n.remove, icon: UserMinusIcon, onClick: () => remove(member) }]),
  });
  return (
    <div>
      {member.name}
      <ContextMenu contextMenu={menu} trigger={<Button variant="ghost" content="icon" icon={DotsThreeIcon} />} />
    </div>
  );
}
```

```tsx
// ✅ Correct — routes/app/settings/project/MembersSection.tsx + useMembersMenu.ts
import { ContextMenuPortal, fromStaticItems, useContextMenu } from "@ui/components/ContextMenu";

function MembersSection() {
  // The items are built from the target passed to open(), so one menu serves every row.
  const menu = useContextMenu({
    align: "end",
    ...fromStaticItems((member: ProjectMembershipRow) => [
      { label: i18n.remove, icon: UserMinusIcon, variant: "destructive", onClick: () => void askRemove(member) },
    ]),
  });
  return (
    <div className="flex flex-col divide-y divide-border">
      {members.map(member => (
        <MemberRow key={member.id} member={member} onOpenMenu={anchor => menu.open(member, anchor)} />
      ))}
      <ContextMenuPortal contextMenu={menu} />
    </div>
  );
}

// The row: a button that hands its own element back as the anchor. No menu imports.
function MemberRow({ member, onOpenMenu }: { member: ProjectMembershipRow; onOpenMenu: (anchor: Element) => void }) {
  return <Button variant="ghost" content="icon" icon={DotsThreeIcon} onClick={e => onOpenMenu(e.currentTarget)} />;
}
```

`menu.open(target, at)` takes an element (the menu anchors to its box), a mouse event (right-click: anchors to the pointer and calls `preventDefault`) or a `DOMRect`. Rows of different kinds in one list share the menu too: make the target a discriminated union and `switch` on it inside `fromStaticItems` (`useMembersMenu.ts` does this for members and invitations).

`<ContextMenu contextMenu={menu} trigger={…} />` renders the trigger and its own portal, which is why it is for a trigger that appears once (a page header, a toolbar), never for a row (`frontend/use-usecontextmenu-for-action-row-menus-not-adhoc`).

**Check before you finish:** `useContextMenu(` or `<ContextMenu ` in a component that is rendered inside a `.map(` is this mistake.
