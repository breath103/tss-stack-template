import { CalendarDots, Folder, MagnifyingGlass, Target, Trash, User } from "@phosphor-icons/react";
import { Button } from "@ui/components/Button";
import { type IconWeight } from "@ui/components/icon";
import { useState } from "react";

const WEIGHTS = ["thin", "light", "regular", "bold", "fill", "duotone"] as const satisfies IconWeight[];
// Labelled by import name — Phosphor's own displayName suffixes "Icon".
const ICONS = [
  { name: "Target", Icon: Target },
  { name: "Folder", Icon: Folder },
  { name: "CalendarDots", Icon: CalendarDots },
  { name: "User", Icon: User },
  { name: "MagnifyingGlass", Icon: MagnifyingGlass },
  { name: "Trash", Icon: Trash },
];

function WeightGrid() {
  return (
    <table className="text-data text-sm">
      <thead className="text-text-3">
        <tr>
          <th />
          {WEIGHTS.map(w => (
            <th key={w} className="px-4 pb-2 text-left font-medium">
              {w}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ICONS.map(({ name, Icon }) => (
          <tr key={name}>
            <td className="pr-6 text-text-3">{name}</td>
            {WEIGHTS.map(w => (
              <td key={w} className="px-4 py-2">
                <Icon className="size-6 text-text-1" weight={w} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// The selected-state idiom: weight carries the state, not a second icon.
function SelectedToggle() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="m"
        icon={Target}
        iconWeight={on ? "fill" : "regular"}
        aria-selected={on}
        onClick={() => setOn(v => !v)}
      />
      <span className="text-sm text-text-3">{on ? "selected — fill" : "resting — regular"}</span>
    </div>
  );
}

export function IconsDemo() {
  return (
    <div className="flex flex-col gap-6">
      <WeightGrid />
      <SelectedToggle />
    </div>
  );
}
