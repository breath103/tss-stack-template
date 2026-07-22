import { cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/utils";
import styles from "./Button.module.css";
import { ButtonLabel, type ButtonSize } from "./ButtonLabel";
import { type IconComponent, type IconWeight } from "./icon";
import { Spinner } from "./Spinner";

// Colors + shape only. The control's dimensions come from ButtonLabel (font-size).
const buttonStyle = cva(
  [
    // layout
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap",
    // transition
    "transition-all duration-150 outline-none",
    // focus
    "focus-visible:ring-[3px] focus-visible:ring-accent-1/50",
    // active / disabled
    "active:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        normal: "button-bg-surface2 text-text-1 ring-1 ring-border [--glow:var(--surface-2)] ring-inset",
        accent1: "bg-accent-1 text-accent-1-fg [--glow:var(--accent-1)]",
        accent2: "bg-accent-2 text-accent-2-fg [--glow:var(--accent-2)]",
        accent3: "bg-accent-3 text-accent-3-fg [--glow:var(--accent-3)]",
        ghost: "button-bg-overlay text-text-2 [--glow:var(--highlight2)]",
        destructive: "bg-error text-error-fg [--glow:var(--error)] focus-visible:ring-error/30",
      },
    },
    defaultVariants: { variant: "normal" },
  }
);

export function Button({
  variant = "normal",
  size,
  text,
  icon,
  iconWeight,
  accessoryIcon,
  loading,
  className,
  ...rest
}: Omit<React.ComponentProps<"button">, "children"> & {
  variant?: "normal" | "accent1" | "accent2" | "accent3" | "ghost" | "destructive";
  size: ButtonSize;
  text?: string;
  icon?: IconComponent;
  iconWeight?: IconWeight;
  accessoryIcon?: IconComponent;
  loading?: boolean;
}) {
  return (
    <button type="button" {...rest} className={cn(buttonStyle({ variant }), styles.glow, "relative", className)}>
      <span className={cn("transition-opacity", loading && "opacity-0")}>
        <ButtonLabel size={size} text={text} icon={icon} iconWeight={iconWeight} accessoryIcon={accessoryIcon} />
      </span>
      {loading && <Spinner className="absolute inset-0 m-auto size-[1.25em] animate-in fade-in-0" />}
    </button>
  );
}
