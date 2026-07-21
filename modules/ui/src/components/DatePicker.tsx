import { Calendar as CalendarIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useDateFormatter } from "../i18n/I18nContext";
import { cn } from "../lib/utils";
import { Button } from "./Button";
import { Calendar } from "./Calendar";
import { applyHHMM, mergeTimeOfDay, TimeInput } from "./DateRangePickerPanel";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  withTime = false,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  // When set, a day pick keeps its time-of-day and a time input is shown; the
  // popover stays open so the user can set the time. Without it, picking a day
  // commits and closes.
  withTime?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const df = useDateFormatter();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="m"
          variant="normal"
          disabled={disabled}
          className={cn("justify-start text-left font-normal", !value && "text-text-3", className)}
          icon={CalendarIcon}
          text={value ? df.format(value, withTime ? "year-date-time" : "year-date") : placeholder}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="flex flex-col gap-2">
        <Calendar
          mode="single"
          selected={value}
          onSelect={date => {
            if (!date) {
              onChange(undefined);
              return;
            }
            onChange(withTime ? mergeTimeOfDay(value, date) : date);
            if (!withTime) setOpen(false);
          }}
          autoFocus
        />
        {withTime && (
          <div className="flex justify-end px-1 pb-1">
            <TimeInput label="Time" value={value} onChange={hhmm => value && onChange(applyHHMM(value, hhmm))} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
