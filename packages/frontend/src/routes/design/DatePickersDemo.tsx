import { DatePicker } from "@ui/components/DatePicker";
import { DateRangePicker } from "@ui/components/DateRangePicker";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { SectionTitle } from "./SectionTitle";

export function DatePickersDemo() {
  const [date, setDate] = useState<Date | undefined>();
  const [dateTime, setDateTime] = useState<Date | undefined>(new Date(2026, 6, 10, 14, 30));
  const [range, setRange] = useState<DateRange | undefined>();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3 rounded-lg border bg-surface-1 p-6">
        <SectionTitle>Date picker</SectionTitle>
        <p className="text-base text-text-2">
          Single-date selection. Wraps <code className="font-mono text-sm">Calendar mode="single"</code> in a popover.
        </p>
        <DatePicker value={date} onChange={setDate} />
        <div className="pt-2 text-sm text-text-3">With time-of-day:</div>
        <DatePicker value={dateTime} onChange={setDateTime} withTime />
        <div className="pt-2 text-sm text-text-3">Disabled state:</div>
        <DatePicker value={undefined} onChange={() => {}} disabled placeholder="Locked" />
      </div>

      <div className="space-y-3 rounded-lg border bg-surface-1 p-6 md:col-span-2">
        <SectionTitle>Date range picker</SectionTitle>
        <p className="text-base text-text-2">
          Range selection — two-month view. Wraps <code className="font-mono text-sm">Calendar mode="range"</code>.
        </p>
        <DateRangePicker value={range} onChange={setRange} />
      </div>
    </div>
  );
}
