import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import * as React from "react";
import { type DayButton as DayButtonType, DayPicker, type DayProps, getDefaultClassNames } from "react-day-picker";
import { cn } from "../lib/utils";
import { Button } from "./Button";
import { type IconComponent } from "./icon";

function NavButton(icon: IconComponent) {
  return function NavButtonImpl(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <Button size="m" {...props} variant="ghost" icon={icon} />;
  };
}

const PreviousMonthButton = NavButton(CaretLeft);
const NextMonthButton = NavButton(CaretRight);

// Cell wrapper (`Day` slot / `<td>`). Owns the continuous range bar: a square
// `highlight2` strip that only rounds where the range caps (start/end). Also
// owns outside-of-month dimming, disabled dimming, hidden. The button itself is
// styled by CalendarDayButton.
function CalendarDay({ day, modifiers, className, children, ...props }: DayProps) {
  void day;
  return (
    <td
      {...(props as React.HTMLAttributes<HTMLTableCellElement>)}
      className={cn(
        "group/day relative aspect-square size-full p-0 text-center select-none",
        modifiers.range_start && "rounded-l-full bg-highlight2",
        modifiers.range_middle && "bg-highlight2",
        modifiers.range_end && "rounded-r-full bg-highlight2",
        modifiers.outside && "text-text-3 aria-selected:text-text-3",
        modifiers.disabled && "text-text-3 opacity-50",
        modifiers.hidden && "invisible",
        className
      )}
    >
      {children}
    </td>
  );
}

// Day token — a circle. Fills only the endpoints (accent-1) and today
// (accent-2); a range middle stays transparent so the cell's range bar shows
// through. Endpoints cap the pill with `rounded-l/r-full` on their outer side;
// every other day is a full circle. Precedence: endpoint / single selection
// beats today. The bar itself is CalendarDay's job.
export function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButtonType>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isEndpoint = !!modifiers.range_start || !!modifiers.range_end;
  const isSelectedSingle = !!modifiers.selected && !isEndpoint && !modifiers.range_middle;
  const fill = (() => {
    if (isEndpoint || isSelectedSingle) return "bg-accent-1 text-accent-1-fg";
    if (modifiers.today) return "bg-accent-2 text-accent-2-fg";
    return "";
  })();

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      className={cn(
        "flex aspect-square w-full min-w-(--cell-size) cursor-pointer items-center justify-center button-bg-overlay text-center leading-none font-normal whitespace-nowrap transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent-1/50 active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:text-sm [&>span]:opacity-70",
        modifiers.range_start ? "rounded-l-full" : modifiers.range_end ? "rounded-r-full" : "rounded-full",
        fill,
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  );
}

// Layout-only className overrides for DayPicker's default DOM. Modifier-based
// styling (range/outside/disabled/hidden) lives on CalendarDay above.
function layoutClassNames() {
  const d = getDefaultClassNames();
  return {
    root: cn("w-fit", d.root),
    months: cn("relative flex flex-col gap-4 md:flex-row", d.months),
    month: cn("flex w-full flex-col gap-4", d.month),
    nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", d.nav),
    month_caption: cn("flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)", d.month_caption),
    caption_label: cn("font-medium select-none", d.caption_label),
    table: "w-full border-collapse",
    weekdays: cn("flex", d.weekdays),
    weekday: cn("flex-1 rounded-md text-sm font-normal text-text-3 select-none", d.weekday),
    week: cn("flex w-full", d.week),
  };
}

export function Calendar({ className, classNames, components, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("group/calendar p-2 [--cell-size:--spacing(8)]", className)}
      classNames={{ ...layoutClassNames(), ...classNames }}
      components={{
        Day: CalendarDay,
        DayButton: CalendarDayButton,
        PreviousMonthButton,
        NextMonthButton,
        ...components,
      }}
      {...props}
    />
  );
}
