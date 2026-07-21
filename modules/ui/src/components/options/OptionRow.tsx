import { Check } from "@phosphor-icons/react";
import { type ComponentProps, type ReactNode } from "react";

import { cn } from "../../lib/utils";

// One selectable row for a list: the shared button-bg-overlay chrome around
// whatever label the caller passes. Native `disabled` blocks it outright; an
// `aria-disabled` row stays hoverable (so a gated option can still show a
// tooltip) but dims and drops its wash.
export function OptionRow({
  selected = false,
  check = false,
  onSelect,
  trailing,
  children,
  className,
  ...rest
}: {
  selected?: boolean;
  /** Shows a check mark when selected — and, because the check already marks the
   *  selection, drops the aria-selected background wash. Leave off to fall back
   *  to the wash as the selection indicator (e.g. a keyboard-highlighted menu). */
  check?: boolean;
  onSelect?: () => void;
  /** Right-aligned accessory (spinner, tag). Takes precedence over the check. */
  trailing?: ReactNode;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "children" | "onSelect">) {
  const mark =
    trailing !== undefined ? trailing : check && selected ? <Check className="size-4 text-accent-1" /> : null;
  return (
    <button
      type="button"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center rounded-sm button-bg-overlay pr-2 text-left text-text-1",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent",
        check && "aria-selected:bg-transparent",
        className
      )}
      {...rest}
    >
      {children}
      {mark !== null && <span className="ml-auto flex shrink-0 items-center pl-2">{mark}</span>}
    </button>
  );
}
