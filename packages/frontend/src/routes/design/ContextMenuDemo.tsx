import { Copy, DotsThree, Faders, Folder, PencilSimple, Trash } from "@phosphor-icons/react";
import { Button } from "@ui/components/Button";
import {
  ContextMenu,
  ContextMenuPortal,
  divider,
  fromStaticItems,
  group,
  type MenuDecoration,
  type StaticMenuItem,
  useContextMenu,
} from "@ui/components/ContextMenu";
import { ShortcutLabel } from "@ui/components/ShortcutLabel";
import { useState } from "react";

type Planet = { label: string; children?: Array<Planet | MenuDecoration> };

const SIZE_ITEMS: Planet[] = ["Small", "Medium", "Large"].map(label => ({
  label,
  // Third level under Large — exercises depth beyond two.
  children: label === "Large" ? ["Matte", "Glossy"].map(finish => ({ label: finish })) : undefined,
}));

const PLANETS: Array<Planet | MenuDecoration> = [
  group("Rocky"),
  ...["Mercury", "Venus", "Earth", "Mars"].map(label => ({ label, children: SIZE_ITEMS })),
  divider,
  group("Beyond"),
  { label: "Jupiter", children: SIZE_ITEMS },
  // Leaf — Enter commits the row alone.
  { label: "Kepler-452b" },
];

export function ContextMenuDemo() {
  const [picked, setPicked] = useState("—");
  const [columns, setColumns] = useState({ Name: true, Status: false, Assignee: true });

  // Right-click menu — planets tree, arbitrary depth, group/divider rows.
  const planetToItem = (planet: Planet, path: string): StaticMenuItem => {
    const label = path === "" ? planet.label : `${path} · ${planet.label}`;
    return {
      label: planet.label,
      ...(planet.children === undefined ? {} : { icon: Folder }),
      onClick: () => setPicked(label),
      children: planet.children?.map(child => (isPlanet(child) ? planetToItem(child, label) : child)),
    };
  };
  const planetMenu = useContextMenu({
    ...fromStaticItems(() => PLANETS.map(planet => (isPlanet(planet) ? planetToItem(planet, "") : planet))),
  });

  // Button-triggered row menu — shortcuts, checked toggles, destructive, disabled reason.
  const rowMenu = useContextMenu(
    fromStaticItems((target: string) => [
      group(target),
      {
        label: "Rename",
        icon: PencilSimple,
        accessory: { custom: <ShortcutLabel shortcut="F2" /> },
        onClick: () => setPicked(`Rename ${target}`),
      },
      {
        label: "Duplicate",
        icon: Copy,
        disabled: { reason: "Demo rows can't be duplicated." },
        onClick: () => setPicked("unreachable"),
      },
      {
        label: "Columns",
        icon: Faders,
        children: Object.entries(columns).map(([name, checked]) => ({
          label: name,
          accessory: { checked },
          onClick: () => setColumns(prev => ({ ...prev, [name]: !checked })),
        })),
      },
      divider,
      {
        label: "Delete",
        icon: Trash,
        variant: "destructive",
        accessory: { custom: <ShortcutLabel shortcut="⌘⌫" /> },
        onClick: () => setPicked(`Delete ${target}`),
      },
    ])
  );

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-3">
        <ContextMenu
          contextMenu={rowMenu}
          target="Row A"
          trigger={<Button variant="ghost" size="m" icon={DotsThree} aria-label="Row menu" />}
        />
        <div
          onContextMenu={e => planetMenu.open(null, e)}
          className="rounded-md border border-dashed px-4 py-2 text-base text-text-2"
        >
          Right-click me
        </div>
      </div>
      <div className="text-sm text-text-3" data-testid="menu-picked">
        Picked: {picked}
      </div>
      <ContextMenuPortal contextMenu={planetMenu} />
    </div>
  );
}

function isPlanet(entry: Planet | MenuDecoration): entry is Planet {
  return "label" in entry;
}
