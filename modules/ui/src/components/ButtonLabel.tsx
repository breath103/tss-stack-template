import { cva } from "class-variance-authority";

import { type IconComponent, type IconWeight } from "./icon";

export type ButtonSize = "s" | "m" | "l";

// A padded row: optional leading icon, optional text, optional trailing
// accessory. Tighter padding when there's a leading icon.
const rowStyle = cva("inline-flex items-center", {
  variants: {
    size: {
      s: "h-[1.6rem] gap-[0.4rem] px-[0.64rem] text-sm",
      m: "h-8 gap-2 px-[0.8rem] text-base",
      l: "h-[2.4rem] gap-[0.6rem] px-[0.96rem] text-base",
    },
    hasIcon: { true: "", false: "" },
  },
  compoundVariants: [
    { size: "s", hasIcon: true, class: "px-[0.48rem]" },
    { size: "m", hasIcon: true, class: "px-[0.6rem]" },
    { size: "l", hasIcon: true, class: "px-[0.72rem]" },
  ],
});

// Pure icon — a square (close / trash / etc.), no text, no accessory.
const squareStyle = cva("inline-flex items-center justify-center", {
  variants: {
    size: { s: "size-[1.6rem]", m: "size-8", l: "size-[2.4rem]" },
  },
});

const iconStyle = cva("shrink-0", {
  variants: {
    size: { s: "size-4", m: "size-5", l: "size-5" },
  },
});

const accessoryStyle = cva("shrink-0 text-text-3", {
  variants: {
    size: { s: "size-[0.8rem]", m: "size-4", l: "size-4" },
  },
});

export function ButtonLabel({
  size,
  text,
  icon: Icon,
  iconWeight,
  accessoryIcon: Accessory,
}: {
  size: ButtonSize;
  text?: string;
  icon?: IconComponent;
  /** Undefined falls through to Phosphor's `regular`. Set `fill` to mark a selected state. */
  iconWeight?: IconWeight;
  /** Trailing icon (e.g. a Selector's dropdown chevron) — deliberately smaller than `icon`. */
  accessoryIcon?: IconComponent;
}) {
  const accessory = Accessory ? <Accessory className={accessoryStyle({ size })} /> : null;

  if (Icon && !text && !accessory) {
    return (
      <span className={squareStyle({ size })}>
        <Icon className={iconStyle({ size })} weight={iconWeight} />
      </span>
    );
  }

  return (
    <span className={rowStyle({ size, hasIcon: Boolean(Icon) })}>
      {Icon && <Icon className={iconStyle({ size })} weight={iconWeight} />}
      <span className="truncate">{text}</span>
      {accessory}
    </span>
  );
}
