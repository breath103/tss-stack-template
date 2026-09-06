import { CaretDown, Check } from "@phosphor-icons/react";
import { cva } from "class-variance-authority";
import { Select as SelectPrimitive } from "radix-ui";
import { type HTMLAttributes, type ReactNode, useState } from "react";
import { cn } from "../lib/utils";
import { OptionLabel, type TextLabel } from "./options/OptionLabel";
import { Tooltip } from "./Tooltip";

// Radix shows the placeholder only when the value is "", and an item may not use
// "" as its value. So a selectable `null` option needs a sentinel, while an unset
// `null` maps to "" to get the placeholder.
const NULL_SENTINEL = "__NULL_SELECT_VALUE__";

type Size = "s" | "m";

/**
 * The row the trigger and every option are built from — ButtonLabel's geometry,
 * so a Selector measures like the Button beside it. The `[&>span]` rules lay out
 * Value and ItemText: those are the two parts Radix portals, and both discard the
 * className you pass them.
 */
const rowStyle = cva(
  "flex cursor-pointer items-center rounded-md transition-all duration-150 [&>span]:flex [&>span]:items-center",
  {
    variants: {
      size: {
        s: "h-[1.6rem] gap-[0.4rem] px-[0.64rem] text-sm [&>span]:gap-[0.4rem]",
        m: "h-8 gap-2 px-[0.8rem] text-base [&>span]:gap-2",
      },
    },
  }
);

// The trigger carries Button's chrome, so the two stay interchangeable. `cell`
// drops the button shape for its container's — cn() lets it beat rowStyle's own
// height, padding and radius — and keeps full opacity when disabled, since a
// read-only cell still shows its value.
const triggerStyle = cva(
  "font-medium text-text-1 outline-none disabled:pointer-events-none data-placeholder:text-text-3",
  {
    variants: {
      variant: {
        // Adopts input semantics (resting fill + focus ring, no hover wash) so a
        // form's selects and text fields read identically — the shared treatment.
        normal:
          "button-bg-overlay focus-input ring-1 ring-border ring-inset disabled:cursor-not-allowed disabled:opacity-50",
        // Inline triggers keep the accent-1 keyboard ring; they're not field boxes.
        ghost: cn(
          // surface
          "button-bg-overlay",
          // focus ring
          "focus-visible:ring-[3px] focus-visible:ring-accent-1/50",
          // disabled
          "disabled:cursor-not-allowed disabled:opacity-50"
        ),
        cell: "size-full rounded-none button-bg-overlay px-2 focus-visible:ring-[3px] focus-visible:ring-accent-1/50",
      },
    },
  }
);

// Room for the absolutely-placed check.
const itemStyle = cva(
  "relative button-bg-overlay data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-transparent",
  {
    variants: { size: { s: "pr-6", m: "pr-8" } },
  }
);

const accessoryStyle = cva("shrink-0 text-text-3", { variants: { size: { s: "size-[0.8rem]", m: "size-4" } } });

function Row({
  as: Tag = "div",
  size,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "button"; size: Size }) {
  return <Tag className={cn(rowStyle({ size }), className)} {...props} />;
}

export function Selector<T extends string | null>({
  value,
  onChange,
  options,
  label,
  placeholder,
  size = "m",
  variant = "normal",
  ariaLabel,
  disabled,
  optionDisabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  /** Maps a value to its label. Rendered inside the option — Radix mirrors the
   *  selected one into the trigger, so this is the trigger's content too. Return
   *  `{ text, icon }` for the usual label, or any node when it isn't one (a Chip,
   *  a swatch, an avatar beside a name). */
  label: (value: T) => TextLabel | ReactNode;
  /** Shown as the trigger label while `value` is null (an unset selector). */
  placeholder?: string;
  /** Matches ButtonLabel's sizes, so the trigger lines up with a Button beside it. */
  size?: Size;
  /** Trigger look: bordered (default), borderless ghost (e.g. filter chips), or
   *  `cell` — fills its container, so a table cell's whole area opens the picker. */
  variant?: "normal" | "ghost" | "cell";
  ariaLabel?: string;
  disabled?: boolean;
  /** Gates one option without hiding it: `false` selectable, `true` disabled, a
   *  string disabled with that reason in a hover tooltip. Radix marks the row
   *  aria-disabled (not disabled), so it still takes hover for the tooltip. */
  optionDisabled?: (value: T) => string | boolean;
}) {
  const [open, setOpen] = useState(false);

  const nullIsOption = options.includes(null as T);
  const toRadix = (v: T): string => (v === null ? (nullIsOption ? NULL_SENTINEL : "") : v);

  // A closed Content still mounts every child — into a detached fragment, which
  // is where the trigger's Value mirrors the selected ItemText from. So a closed
  // Selector needs the selected option and nothing else; mounting the rest would
  // cost every row of a table its whole option list. Typeahead-while-closed is
  // what that buys, and we don't use it.
  const mounted = open ? options : options.filter(opt => opt === value);

  return (
    <SelectPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      value={toRadix(value)}
      onValueChange={v => onChange((v === NULL_SENTINEL ? null : v) as T)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        asChild
        aria-label={ariaLabel}
        // A cell fills a row that is itself clickable; opening the picker must
        // not also select the row behind it.
        onClick={variant === "cell" ? e => e.stopPropagation() : undefined}
      >
        <Row as="button" size={size} className={triggerStyle({ variant })}>
          <SelectPrimitive.Value placeholder={placeholder} />
          {variant !== "cell" && (
            <SelectPrimitive.Icon asChild>
              <CaretDown className={accessoryStyle({ size })} />
            </SelectPrimitive.Icon>
          )}
        </Row>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        {/* item-aligned overlays the trigger with the selected option on top of
            it, so options share the trigger's size; Radix places the wrapper
            inline, reading z-index off this node. */}
        <SelectPrimitive.Content
          position="item-aligned"
          className="z-50 rounded-md bg-surface-2 p-1 ring-1 ring-border"
        >
          <SelectPrimitive.Viewport className="max-h-80 overflow-y-auto">
            {mounted.map(opt => {
              const gate = optionDisabled?.(opt) ?? false;
              const reason = typeof gate === "string" ? gate : null;
              const key = opt ?? NULL_SENTINEL;
              const item = (
                <SelectPrimitive.Item key={key} value={toRadix(opt)} disabled={gate !== false} asChild>
                  <Row size={size} className={itemStyle({ size })}>
                    <SelectPrimitive.ItemText>
                      <OptionLabel label={label(opt)} size={size} />
                    </SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="absolute right-2">
                      <Check className={accessoryStyle({ size })} />
                    </SelectPrimitive.ItemIndicator>
                  </Row>
                </SelectPrimitive.Item>
              );
              // Selector owns the gated-row tooltip so it wraps the whole row, not
              // whatever the label happens to render.
              return reason === null ? (
                item
              ) : (
                <Tooltip key={key} label={reason} side="right" className="max-w-xs">
                  {item}
                </Tooltip>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
