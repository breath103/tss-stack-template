import { cva } from "class-variance-authority";
import { isValidElement, type ReactNode } from "react";
import { type IconComponent } from "../icon";

// The label vocabulary the Selector trigger and every option list share: a value
// maps either to `{ icon, text }` (the common case — the list sizes the icon to
// match) or to any node when the label isn't that shape (a Chip, a swatch, an
// avatar beside a name).
export type TextLabel = { text?: string; icon?: IconComponent };

const iconStyle = cva("shrink-0", { variants: { size: { s: "size-4", m: "size-5" } } });

// A TextLabel is the only object a label may return that isn't already a node,
// so anything else — string, element, fragment, null — passes through as-is.
const isTextLabel = (label: TextLabel | ReactNode): label is TextLabel =>
  typeof label === "object" && label !== null && !isValidElement(label) && !Array.isArray(label);

export function OptionLabel({ label, size }: { label: TextLabel | ReactNode; size: "s" | "m" }) {
  if (!isTextLabel(label)) return <>{label}</>;
  const { text, icon: Icon } = label;
  return (
    <>
      {Icon && <Icon className={iconStyle({ size })} />}
      {text}
    </>
  );
}
