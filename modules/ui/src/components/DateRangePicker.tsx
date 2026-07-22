import { Calendar } from "@phosphor-icons/react";
import { useState } from "react";
import type { DateRange, Matcher } from "react-day-picker";
import { useDateFormatter } from "../i18n/I18nContext";
import { cn } from "../lib/utils";
import { type DateRangeEndpoint, DateRangePickerPanel, useTypedDateInput } from "./DateRangePickerPanel";
import { Input } from "./Input";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

export type { DateRangeEndpoint } from "./DateRangePickerPanel";
export { DateRangePickerPanel } from "./DateRangePickerPanel";

// Two-endpoint trigger: [📅][start input] — [📅][end input]. Each calendar
// button opens the popover and pre-focuses ITS endpoint inside the panel.
// On every open, `initialActive` is fed into the freshly-mounted panel so
// "right button → end is active" works even after the popover was previously
// opened on the start side.
export function DateRangePicker({
  value,
  onChange,
  startPlaceholder = "Start",
  endPlaceholder = "End",
  disabled = false,
  withTime = false,
  disabledDates,
  className,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  disabled?: boolean;
  withTime?: boolean;
  disabledDates?: Matcher | Matcher[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pendingActive, setPendingActive] = useState<DateRangeEndpoint>("start");
  function openAt(endpoint: DateRangeEndpoint) {
    setPendingActive(endpoint);
    setOpen(true);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex h-9 w-72 items-center rounded-md border bg-input px-1 text-base focus-input transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <EndpointTrigger endpoint="start" label="Open start" disabled={disabled} onOpen={openAt} />
        <DateField
          date={value?.from}
          placeholder={startPlaceholder}
          disabled={disabled}
          onCommit={d => onChange({ from: d, to: value?.to })}
        />
        <span className="px-1 text-text-3">—</span>
        <EndpointTrigger endpoint="end" label="Open end" disabled={disabled} onOpen={openAt} />
        <DateField
          date={value?.to}
          placeholder={endPlaceholder}
          disabled={disabled}
          onCommit={d => onChange({ from: value?.from, to: d })}
        />
      </div>
      <PopoverContent align="start" onOpenAutoFocus={e => e.preventDefault()}>
        <DateRangePickerPanel
          value={value}
          onChange={onChange}
          withTime={withTime}
          disabledDates={disabledDates}
          initialActive={pendingActive}
        />
      </PopoverContent>
    </Popover>
  );
}

function EndpointTrigger({
  endpoint,
  label,
  disabled,
  onOpen,
}: {
  endpoint: DateRangeEndpoint;
  label: string;
  disabled: boolean;
  onOpen: (endpoint: DateRangeEndpoint) => void;
}) {
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        onClick={() => onOpen(endpoint)}
        className={cn(
          // layout
          "flex size-7 shrink-0 items-center justify-center",
          // surface
          "rounded-sm button-bg-overlay text-text-2",
          // transition
          "transition-all duration-150",
          // hover
          "hover:text-text-1",
          // focus / active
          "focus-visible:outline-none active:scale-[0.92]",
          // disabled
          "disabled:pointer-events-none"
        )}
      >
        <Calendar className="size-4" />
      </button>
    </PopoverTrigger>
  );
}

function DateField({
  date,
  placeholder,
  disabled,
  onCommit,
}: {
  date: Date | undefined;
  placeholder: string;
  disabled: boolean;
  onCommit: (date: Date | undefined) => void;
}) {
  const df = useDateFormatter();
  const { isEmpty, ...field } = useTypedDateInput({
    value: date,
    formatDisplay: d => df.format(d, "year-date"),
    onCommit,
  });
  void isEmpty;
  return (
    <Input
      chromeless
      {...field}
      placeholder={placeholder}
      disabled={disabled}
      className="h-7 min-w-0 flex-1 px-1 text-base"
    />
  );
}
