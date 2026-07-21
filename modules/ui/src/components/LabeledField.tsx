import type { ReactNode } from "react";

// A form field's label: the block `<label>` with a muted caption above its
// control. Shared by the admin org/user add-edit forms so every field row reads
// identically.
export function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-text-3">{label}</span>
      {children}
    </label>
  );
}
