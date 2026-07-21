import { Checkbox } from "@ui/components/Checkbox";
import { useState } from "react";
import { SectionTitle } from "./SectionTitle";

export function CheckboxDemo() {
  const [checked, setChecked] = useState(true);
  const [items, setItems] = useState({ a: true, b: false, c: true });
  const allChecked = items.a && items.b && items.c;
  const noneChecked = !items.a && !items.b && !items.c;
  const labels: { key: keyof typeof items; label: string }[] = [
    { key: "a", label: "Pre-flight checklist complete" },
    { key: "b", label: "Range safety armed" },
    { key: "c", label: "Telemetry stream active" },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4 rounded-lg border bg-surface-1 p-6">
        <SectionTitle>States</SectionTitle>
        <div className="flex flex-col gap-3 text-text-2">
          <label className="flex items-center gap-3">
            <Checkbox checked={false} onChange={() => {}} />
            Unchecked
          </label>
          <label className="flex items-center gap-3">
            <Checkbox checked={true} onChange={() => {}} />
            Checked
          </label>
          <label className="flex items-center gap-3">
            <Checkbox checked={false} indeterminate onChange={() => {}} />
            Indeterminate
          </label>
          <label className="flex items-center gap-3">
            <Checkbox checked={false} disabled onChange={() => {}} />
            Disabled (unchecked)
          </label>
          <label className="flex items-center gap-3">
            <Checkbox checked={true} disabled onChange={() => {}} />
            Disabled (checked)
          </label>
        </div>
      </div>
      <div className="space-y-4 rounded-lg border bg-surface-1 p-6">
        <SectionTitle>Interactive</SectionTitle>
        <label className="flex items-center gap-3 text-text-2">
          <Checkbox checked={checked} onChange={setChecked} />
          Toggle me — currently {checked ? "on" : "off"}
        </label>
        <div className="space-y-2 border-t pt-4">
          <label className="flex items-center gap-3 font-medium text-text-1">
            <Checkbox
              checked={allChecked}
              indeterminate={!allChecked && !noneChecked}
              onChange={next => setItems({ a: next, b: next, c: next })}
            />
            Select all
          </label>
          <div className="space-y-2 pl-7">
            {labels.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 text-text-2">
                <Checkbox checked={items[key]} onChange={next => setItems(prev => ({ ...prev, [key]: next }))} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
