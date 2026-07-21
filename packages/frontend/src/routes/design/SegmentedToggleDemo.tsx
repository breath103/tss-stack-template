import { SegmentedToggle } from "@ui/components/SegmentedToggle";
import { useState } from "react";
import { SectionTitle } from "./SectionTitle";

export function SegmentedToggleDemo() {
  const [view, setView] = useState<"table" | "tree">("table");
  const [range, setRange] = useState<"day" | "week" | "month">("week");

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4 rounded-lg border bg-surface-1 p-6">
        <SectionTitle>Two options</SectionTitle>
        <p className="text-base text-text-2">Pill-style segmented control; the active segment is tinted.</p>
        <div className="flex">
          <SegmentedToggle
            value={view}
            onChange={setView}
            options={[
              { id: "table", label: "Table" },
              { id: "tree", label: "Tree" },
            ]}
          />
        </div>
      </div>
      <div className="space-y-4 rounded-lg border bg-surface-1 p-6">
        <SectionTitle>Three options</SectionTitle>
        <p className="text-base text-text-2">
          Currently <span className="font-medium text-text-1">{range}</span>.
        </p>
        <div className="flex">
          <SegmentedToggle
            value={range}
            onChange={setRange}
            options={[
              { id: "day", label: "Day" },
              { id: "week", label: "Week" },
              { id: "month", label: "Month" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
