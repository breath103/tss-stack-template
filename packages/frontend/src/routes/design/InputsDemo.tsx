import { Checkbox } from "@ui/components/Checkbox";
import { Input } from "@ui/components/Input";
import { useState } from "react";
import { SectionTitle } from "./SectionTitle";

// Raw <input type="number"> styling for the playground controls. Input
// primitive is text-only; if a NumberInput primitive lands, swap to that.
const NUMBER_INPUT_CLASS =
  "h-9 w-20 rounded-md border bg-input px-3 text-base text-text-1 transition-colors focus-input disabled:cursor-not-allowed disabled:opacity-50";

export function InputsDemo() {
  const [callsign, setCallsign] = useState("");

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <SectionTitle className="block">Callsign</SectionTitle>
        <Input value={callsign} onChange={setCallsign} placeholder="Enter callsign" />
      </div>
      <div className="space-y-2">
        <SectionTitle className="block">Disabled</SectionTitle>
        <Input value="LOCKED" onChange={() => {}} disabled readOnly />
      </div>
      <div className="md:col-span-2">
        <AutoresizePlayground />
      </div>
    </div>
  );
}

function AutoresizePlayground() {
  const [notes, setNotes] = useState("");
  const [autoresize, setAutoresize] = useState(true);
  const [minLine, setMinLine] = useState(1);
  const [maxLine, setMaxLine] = useState(4);

  return (
    <div className="space-y-3 rounded-lg border bg-surface-1 p-6">
      <SectionTitle>Auto-resize playground</SectionTitle>
      <p className="text-base text-text-2">
        Toggle the flag and tune the bounds, then type into the field. Empty stays at{" "}
        <code className="text-data text-sm">minLine</code>; content grows up to{" "}
        <code className="text-data text-sm">maxLine</code>, then scrolls inside.
      </p>
      <div className="flex flex-wrap items-end gap-6 border-y py-4">
        <label className="flex items-center gap-3 text-text-2">
          <Checkbox checked={autoresize} onChange={setAutoresize} />
          <SectionTitle>autoresize</SectionTitle>
        </label>
        <div className="space-y-1">
          <SectionTitle className="block">minLine</SectionTitle>
          <input
            id="minLine"
            type="number"
            min={1}
            max={maxLine}
            value={minLine}
            onChange={e => {
              const next = Math.max(1, Math.min(e.currentTarget.valueAsNumber || 1, maxLine));
              setMinLine(next);
            }}
            disabled={!autoresize}
            className={NUMBER_INPUT_CLASS}
          />
        </div>
        <div className="space-y-1">
          <SectionTitle className="block">maxLine</SectionTitle>
          <input
            id="maxLine"
            type="number"
            min={minLine}
            max={20}
            value={maxLine}
            onChange={e => {
              const next = Math.max(minLine, Math.min(e.currentTarget.valueAsNumber || minLine, 20));
              setMaxLine(next);
            }}
            disabled={!autoresize}
            className={NUMBER_INPUT_CLASS}
          />
        </div>
        <div className="ml-auto text-sm text-text-3">
          rendering:{" "}
          <code className="text-data">
            {autoresize ? `<textarea> minLine=${minLine} maxLine=${maxLine}` : "<input>"}
          </code>
        </div>
      </div>
      {autoresize ? (
        <Input
          autoresize
          minLine={minLine}
          maxLine={maxLine}
          value={notes}
          onChange={setNotes}
          placeholder="Type — the field grows up to maxLine, then scrolls inside."
        />
      ) : (
        <Input value={notes} onChange={setNotes} placeholder="Single-line input (autoresize off)." />
      )}
    </div>
  );
}
