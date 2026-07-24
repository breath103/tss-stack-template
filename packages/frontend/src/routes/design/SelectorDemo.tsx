import { Rocket } from "@phosphor-icons/react";
import { Button } from "@ui/components/Button";
import { Chip, type SemanticColor } from "@ui/components/Chip";
import { Selector } from "@ui/components/Selector";
import { Tooltip } from "@ui/components/Tooltip";
import { Fragment, useState } from "react";
import { SectionTitle } from "./SectionTitle";

const TRAJECTORIES = ["hohmann", "bi-elliptic", "direct", "low-energy"] as const;
type Trajectory = (typeof TRAJECTORIES)[number];

const TRAJECTORY_TEXT: Record<Trajectory, string> = {
  hohmann: "Hohmann transfer",
  "bi-elliptic": "Bi-elliptic",
  direct: "Direct ascent",
  "low-energy": "Low-energy transfer",
};

const TRAJECTORY_COLOR: Record<Trajectory, SemanticColor> = {
  hohmann: "blue",
  "bi-elliptic": "purple",
  direct: "amber",
  "low-energy": "emerald",
};

const SIZES = ["s", "m"] as const;

export function SelectorDemo() {
  const [text, setText] = useState<Trajectory>("hohmann");
  const [iconText, setIconText] = useState<Trajectory>("hohmann");
  const [nullable, setNullable] = useState<Trajectory | null>(null);
  const [ghost, setGhost] = useState<Trajectory>("hohmann");
  const [cell, setCell] = useState<Trajectory>("hohmann");

  return (
    <div className="space-y-6">
      <p className="text-base text-text-2">
        Built directly on the Radix select primitive. The trigger holds a{" "}
        <code className="font-mono text-sm">SelectValue</code>, which Radix fills by mirroring the selected option into
        it — so an option's icon and text appear in the trigger with no trigger-side markup. The trigger and every
        option share one row built from <code className="font-mono text-sm">ButtonLabel</code>'s geometry, so the
        trigger is dimensionally identical to the Button beside it at each size.
      </p>

      <Comparison title="Text label" value={text} onChange={setText} label={v => ({ text: TRAJECTORY_TEXT[v] })} />
      <Comparison
        title="Icon + text label"
        value={iconText}
        onChange={setIconText}
        label={v => ({ icon: Rocket, text: TRAJECTORY_TEXT[v] })}
      />

      <div className="space-y-3 rounded-lg border bg-surface-1 p-6">
        <SectionTitle>Nullable + placeholder</SectionTitle>
        <p className="text-base text-text-2">
          <code className="font-mono text-sm">value=null</code> with a{" "}
          <code className="font-mono text-sm">placeholder</code> shows the placeholder as the trigger label until a
          value is picked.
        </p>
        <Selector
          value={nullable}
          onChange={setNullable}
          options={TRAJECTORIES}
          label={v => ({ text: v === null ? "" : TRAJECTORY_TEXT[v] })}
          placeholder="Select trajectory"
          ariaLabel="Trajectory"
        />
        <div className="pt-2 text-sm text-text-3">Disabled state:</div>
        <Selector
          value={TRAJECTORIES[0]}
          onChange={() => {}}
          options={TRAJECTORIES}
          label={v => ({ text: TRAJECTORY_TEXT[v] })}
          disabled
          ariaLabel="Trajectory (disabled)"
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-surface-1 p-6">
        <SectionTitle>Ghost variant</SectionTitle>
        <p className="text-base text-text-2">
          <code className="font-mono text-sm">variant="ghost"</code> — a borderless trigger for low-emphasis spots like
          filter chips.
        </p>
        <Selector
          value={ghost}
          onChange={setGhost}
          options={TRAJECTORIES}
          label={v => ({ text: TRAJECTORY_TEXT[v] })}
          variant="ghost"
          ariaLabel="Trajectory (ghost)"
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-surface-1 p-6">
        <SectionTitle>Node label, cell trigger, gated options</SectionTitle>
        <p className="text-base text-text-2">
          <code className="font-mono text-sm">label</code> returns{" "}
          <code className="font-mono text-sm">{"{ text, icon }"}</code> or any node — here a{" "}
          <code className="font-mono text-sm">Chip</code>, which Radix mirrors into the trigger untouched.{" "}
          <code className="font-mono text-sm">variant="cell"</code> drops the button shape to fill its container, so a
          table cell's whole area opens the picker — the box below is the cell.{" "}
          <code className="font-mono text-sm">optionDisabled</code> gates a row without hiding it; Radix marks it
          aria-disabled rather than disabled, so it still takes hover and the label can say why (hover the dimmed chip).
        </p>
        <div className="w-72 overflow-hidden rounded-md border">
          <div className="h-9 border-b bg-surface-2">
            <Selector
              value={cell}
              onChange={setCell}
              options={TRAJECTORIES}
              label={v => {
                const chip = <Chip color={TRAJECTORY_COLOR[v]}>{TRAJECTORY_TEXT[v]}</Chip>;
                if (v !== "low-energy") return chip;
                return (
                  <Tooltip label="Needs a gravity assist window." side="right" className="max-w-xs">
                    {chip}
                  </Tooltip>
                );
              }}
              optionDisabled={v => v === "low-energy"}
              variant="cell"
              ariaLabel="Trajectory (cell)"
            />
          </div>
          <div className="flex h-9 items-center px-2 text-sm text-text-3">a sibling cell</div>
        </div>
      </div>
    </div>
  );
}

function Comparison({
  title,
  value,
  onChange,
  label,
}: {
  title: string;
  value: Trajectory;
  onChange: (value: Trajectory) => void;
  label: (value: Trajectory) => { text?: string; icon?: typeof Rocket };
}) {
  return (
    <div className="rounded-lg border bg-surface-1 p-6">
      <SectionTitle className="mb-4">{title}</SectionTitle>
      <div className="grid grid-cols-[3rem_1fr_1fr] items-center justify-items-start gap-x-6 gap-y-4">
        <div className="text-sm text-text-3">size</div>
        <div className="text-sm text-text-3">Selector</div>
        <div className="text-sm text-text-3">Button</div>
        {SIZES.map(size => (
          <Fragment key={size}>
            <div className="font-mono text-sm text-text-3">{size}</div>
            <Selector
              value={value}
              onChange={onChange}
              options={TRAJECTORIES}
              label={label}
              size={size}
              ariaLabel="Trajectory"
            />
            <Button variant="normal" size={size} {...label(value)} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
