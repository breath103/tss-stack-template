import { X } from "@phosphor-icons/react";
import { type ComponentPropsWithoutRef, type CSSProperties, forwardRef, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nContext";
import { cn } from "../lib/utils";
import dict from "./Chip.i18n.json";
import styles from "./Chip.module.css";
import { Skeleton } from "./Skeleton";

// Canonical chip shape used by every tag/status/type label across the app.
// Pick one of the named SemanticColor values — never inject className.
// If you find yourself wanting to override the look, add a new color here;
// don't escape this API. Future domain types should conform to this set.
export type SemanticColor =
  | "gray"
  | "green"
  | "red"
  | "blue"
  | "mint"
  | "purple"
  | "rose"
  | "sky"
  | "indigo"
  | "amber"
  | "emerald";

// forwardRef + rest-prop passthrough so Chip works as a Radix `asChild` trigger
// (Tooltip/Popover/Select clone the child and inject a ref plus event/data-state
// props, all of which must reach the underlying <span>).
export const Chip = forwardRef<
  HTMLSpanElement,
  {
    color?: SemanticColor;
    title?: string;
    /** When set, an X button is rendered; clicking it calls this. */
    onDismiss?: () => void;
    children: ReactNode;
  } & Omit<ComponentPropsWithoutRef<"span">, "color" | "title" | "children">
>(function Chip({ color = "gray", title, onDismiss, children, style, ...rest }, ref) {
  const i18n = useI18n(dict);

  return (
    <span
      ref={ref}
      style={{ ...style, "--base-color": `var(--palette-${color})` } as CSSProperties}
      className={cn(
        styles.base,
        "flex h-[2em] flex-row items-center rounded-full text-sm font-medium whitespace-nowrap"
      )}
      title={title}
      {...rest}
    >
      <span className={cn("pl-[0.6em]", !onDismiss && "pr-[0.6em]")}>{children}</span>
      {onDismiss && (
        <button
          type="button"
          onPointerDown={e => e.preventDefault()}
          // Dismissing must never also fire the surface the chip sits on — a
          // popover trigger it's nested in, a clickable row behind it.
          onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label={i18n.remove}
          className="mr-[0.20em] flex items-center justify-center rounded-full button-bg-overlay p-[0.15em] transition-colors duration-150"
        >
          <X className="size-[1.1em]" />
        </button>
      )}
    </span>
  );
});

// Use while loading data that will resolve to a <Chip>.
export function ChipSkeleton() {
  return <Skeleton className="h-4.5 w-16 rounded-full" />;
}
