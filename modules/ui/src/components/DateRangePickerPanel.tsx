// Single-file range picker: two text inputs + a Calendar, with click-drag
// across days. Replaces a 6-file 305-line atomization whose only consumers
// were each other. Side-by-side reading is the only way to keep the input
// state machine and the calendar pickDay path consistent — the bugs that
// motivated this rewrite all came from "active" being mutated in two places
// (typed-commit AND calendar-pick) without anyone noticing they conflicted.
//
// Rules of `active`:
//   - Set by input focus (clicking the start input → active="start").
//   - Auto-advanced start→end by a CALENDAR pick (the dual-picker affordance).
//   - NEVER changed by a typed commit. Typed commits write the endpoint and
//     leave `active` alone. The user is still "in" that input.
//
// Rules of `writeEndpoint`:
//   - Only writes the named endpoint. Never silently clears the other one.
//     If the user creates a backwards range (from > to), the data reflects
//     what they did and the calendar renders it ordered. Downstream is free
//     to sort on save.

import { X } from "@phosphor-icons/react";
import { isAfter, isSameDay, isValid, parse } from "date-fns";
import { createContext, type PointerEvent, useContext, useEffect, useRef, useState } from "react";
import type { DateRange, DayButton, Matcher } from "react-day-picker";
import { useDateFormatter } from "../i18n/I18nContext";
import { cn } from "../lib/utils";
import { Button } from "./Button";
import { Calendar, CalendarDayButton } from "./Calendar";
import { Input } from "./Input";

export type DateRangeEndpoint = "start" | "end";

type DateRangePickerLabels = {
  start: string;
  end: string;
  notSet: string;
  clear: string;
};

const DEFAULT_LABELS: DateRangePickerLabels = {
  start: "Start",
  end: "End",
  notSet: "Not set",
  clear: "Clear",
};

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ────────────────────────────────────────────────────────────────────────────

const PARSE_FORMATS = ["yyyy/MM/dd", "yyyy-MM-dd", "LLL d, y", "MMMM d, y", "M/d/y", "M. d."];

function parseTyped(input: string, reference: Date): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  for (const fmt of PARSE_FORMATS) {
    const d = parse(trimmed, fmt, reference);
    if (isValid(d)) return d;
  }
  return null;
}

function writeEndpoint(value: DateRange | undefined, endpoint: DateRangeEndpoint, date: Date): DateRange {
  return endpoint === "start" ? { from: date, to: value?.to } : { from: value?.from, to: date };
}

function orderedRange(a: Date, b: Date): DateRange {
  return isAfter(a, b) ? { from: b, to: a } : { from: a, to: b };
}

// Calendar's mode="range" expects from <= to. If the user typed a backwards
// range, present it ordered to the calendar — but keep the data as-is.
function calendarSelected(value: DateRange | undefined): DateRange | undefined {
  if (!value?.from && !value?.to) return undefined;
  if (value.from && value.to) return orderedRange(value.from, value.to);
  return { from: value.from ?? value.to, to: undefined };
}

function emptyToUndefined(value: DateRange | undefined): DateRange | undefined {
  return value?.from || value?.to ? value : undefined;
}

export function mergeTimeOfDay(carrier: Date | undefined, day: Date): Date {
  if (!carrier) return day;
  const out = new Date(day);
  out.setHours(carrier.getHours(), carrier.getMinutes(), 0, 0);
  return out;
}

export function applyHHMM(target: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const out = new Date(target);
  out.setHours(h, m, 0, 0);
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Typed-input state machine. Shared with DateRangePicker.tsx (trigger).
// ────────────────────────────────────────────────────────────────────────────

// Live-sync input: every keystroke that parses to a date fires onCommit
// immediately, so the calendar reflects what the user is typing in real time
// — no draft buffer hiding the parsed value behind a blur boundary.
//
// `draft` only persists keystrokes that DON'T parse (partial input like "6.")
// so the user can keep typing. As soon as the buffer parses cleanly, onCommit
// fires and the next render shows the formatted display.
export function useTypedDateInput({
  value,
  formatDisplay,
  onCommit,
  onStartEdit,
}: {
  value: Date | undefined;
  formatDisplay: (date: Date) => string;
  onCommit: (date: Date | undefined) => void;
  onStartEdit?: () => void;
}) {
  const display = value ? formatDisplay(value) : "";
  const [draft, setDraft] = useState<string | null>(null);

  function handleChange(next: string) {
    setDraft(next);
    const trimmed = next.trim();
    if (!trimmed) {
      if (value) onCommit(undefined);
      return;
    }
    const parsed = parseTyped(trimmed, value ?? new Date());
    if (parsed && parsed.getTime() !== value?.getTime()) onCommit(parsed);
  }

  return {
    value: draft ?? display,
    isEmpty: !(draft ?? display),
    onChange: handleChange,
    onFocus: () => {
      setDraft(null);
      onStartEdit?.();
    },
    onBlur: () => {
      setDraft(null);
    },
    onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Click-drag context. Threaded to the calendar's DayButton override so the
// override stays module-level (stable React identity) instead of being
// reconstructed per render.
// ────────────────────────────────────────────────────────────────────────────

const DragContext = createContext<{
  begin: (date: Date, event: PointerEvent<HTMLButtonElement>) => void;
  enter: (date: Date) => void;
  finish: (date: Date) => void;
} | null>(null);

function DragAwareDayButton(props: React.ComponentProps<typeof DayButton>) {
  const drag = useContext(DragContext);
  return (
    <CalendarDayButton
      {...props}
      onPointerDown={e => {
        props.onPointerDown?.(e);
        if (!e.defaultPrevented && !props.modifiers.disabled) drag?.begin(props.day.date, e);
      }}
      onPointerEnter={e => {
        props.onPointerEnter?.(e);
        if (!e.defaultPrevented && !props.modifiers.disabled) drag?.enter(props.day.date);
      }}
      onPointerUp={e => {
        props.onPointerUp?.(e);
        if (!e.defaultPrevented && !props.modifiers.disabled) drag?.finish(props.day.date);
      }}
    />
  );
}

const DAY_BUTTON_OVERRIDE = { DayButton: DragAwareDayButton };

function useRangeDrag({
  onChange,
  setActive,
}: {
  onChange: (range: DateRange | undefined) => void;
  setActive: (endpoint: DateRangeEndpoint) => void;
}) {
  const anchorRef = useRef<Date | null>(null);
  const hoverRef = useRef<Date | null>(null);
  const draggedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  function begin(date: Date, event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    anchorRef.current = date;
    hoverRef.current = date;
    draggedRef.current = false;
  }

  function enter(date: Date) {
    const anchor = anchorRef.current;
    if (!anchor || isSameDay(anchor, date)) return;
    hoverRef.current = date;
    draggedRef.current = true;
    setDragging(true);
    onChange(orderedRange(anchor, date));
  }

  function finish(date: Date) {
    const anchor = anchorRef.current;
    if (anchor && draggedRef.current) {
      onChange(orderedRange(anchor, date));
      setActive("end");
      suppressClickRef.current = true;
      // The day's onClick fires after onPointerUp. Clear suppress on the next
      // microtask so the click sees suppress=true and bails out.
      window.setTimeout(() => {
        suppressClickRef.current = false;
      });
    }
    anchorRef.current = null;
    hoverRef.current = null;
    draggedRef.current = false;
    setDragging(false);
  }

  // pointerup may land OUTSIDE the calendar (user dragged past the edge).
  // Listen globally while a drag is active so the range still finalizes.
  useEffect(() => {
    if (!dragging) return;
    function onUp() {
      const target = hoverRef.current ?? anchorRef.current;
      if (target) finish(target);
    }
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
    // `finish` reads from refs; safe to omit from deps.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [dragging]);

  return { api: { begin, enter, finish }, shouldSuppressClick: () => suppressClickRef.current };
}

// ────────────────────────────────────────────────────────────────────────────
// Endpoint input — start or end. Inlined; only used here.
// ────────────────────────────────────────────────────────────────────────────

function EndpointInput({
  endpoint,
  label,
  value,
  active,
  notSet,
  clearLabel,
  onSelect,
  onCommit,
  onClear,
  autoFocus,
}: {
  endpoint: DateRangeEndpoint;
  label: string;
  value: Date | undefined;
  active: boolean;
  notSet: string;
  clearLabel: string;
  onSelect: () => void;
  onCommit: (date: Date | undefined) => void;
  onClear?: () => void;
  autoFocus?: boolean;
}) {
  const df = useDateFormatter();
  const { isEmpty, ...field } = useTypedDateInput({
    value,
    formatDisplay: date => df.format(date, "year-date"),
    onCommit,
    onStartEdit: onSelect,
  });
  return (
    <div className="relative" data-range-endpoint={endpoint} data-state={active ? "active" : "inactive"}>
      <Input
        {...field}
        autoFocus={autoFocus}
        placeholder={notSet}
        aria-label={label}
        className={cn("font-medium", onClear && "pr-9", isEmpty && "text-text-3")}
      />
      {onClear && (
        <Button
          size="s"
          variant="ghost"
          icon={X}
          onClick={onClear}
          aria-label={`${clearLabel} ${label}`}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 text-text-3"
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Time input — sanctioned narrow exception to the "no native date/time input"
// rule. Disabled until its endpoint has a day.
// ────────────────────────────────────────────────────────────────────────────

export function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | undefined;
  onChange: (hhmm: string) => void;
}) {
  const df = useDateFormatter();
  return (
    <input
      type="time"
      aria-label={label}
      disabled={!value}
      value={value ? df.format(value, "time") : ""}
      onChange={e => {
        if (e.target.value) onChange(e.target.value);
      }}
      className="rounded-lg border bg-input px-2.5 py-1.5 text-base text-text-1 focus-input transition-all duration-150 disabled:opacity-50"
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Panel — the public component.
// ────────────────────────────────────────────────────────────────────────────

export function DateRangePickerPanel({
  value,
  onChange,
  labels = DEFAULT_LABELS,
  initialActive = "start",
  numberOfMonths = 2,
  defaultMonth,
  disabledDates,
  withTime = false,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  labels?: DateRangePickerLabels;
  initialActive?: DateRangeEndpoint;
  numberOfMonths?: number;
  defaultMonth?: Date;
  disabledDates?: Matcher | Matcher[];
  withTime?: boolean;
}) {
  const [active, setActive] = useState<DateRangeEndpoint>(initialActive);

  function emit(next: DateRange | undefined) {
    onChange(emptyToUndefined(next));
  }

  const drag = useRangeDrag({ onChange: emit, setActive });

  function pickDay(day: Date) {
    if (drag.shouldSuppressClick()) return;
    const carrier = withTime ? (active === "start" ? value?.from : value?.to) : undefined;
    const picked = mergeTimeOfDay(carrier, day);
    emit(writeEndpoint(value, active, picked));
    // Calendar-pick auto-advance: when the user just picked a start, they're
    // most likely about to pick the end next. Typed commits do NOT do this.
    if (active === "start") setActive("end");
  }

  function clear(endpoint: DateRangeEndpoint) {
    setActive(endpoint);
    emit({
      from: endpoint === "start" ? undefined : value?.from,
      to: endpoint === "end" ? undefined : value?.to,
    });
  }

  function commitTyped(endpoint: DateRangeEndpoint, date: Date | undefined) {
    if (!date) {
      clear(endpoint);
      return;
    }
    const carrier = withTime ? (endpoint === "start" ? value?.from : value?.to) : undefined;
    const picked = mergeTimeOfDay(carrier, date);
    emit(writeEndpoint(value, endpoint, picked));
    // Intentionally NO setActive here. See the "Rules of `active`" comment
    // at the top — typed commits must not flip active.
  }

  return (
    <div className="flex w-fit flex-col p-2">
      {/* `w-0 min-w-full` lets the cards row fill the parent width (set by
          the Calendar below) without contributing its own intrinsic input
          width back up to the parent — otherwise the two text inputs would
          push the popover wider than the calendar. */}
      <div className="grid w-0 min-w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2 pb-2">
        <EndpointInput
          endpoint="start"
          label={labels.start}
          value={value?.from}
          active={active === "start"}
          notSet={labels.notSet}
          clearLabel={labels.clear}
          onSelect={() => setActive("start")}
          onCommit={d => commitTyped("start", d)}
          onClear={value?.from ? () => clear("start") : undefined}
          autoFocus={initialActive === "start"}
        />
        <EndpointInput
          endpoint="end"
          label={labels.end}
          value={value?.to}
          active={active === "end"}
          notSet={labels.notSet}
          clearLabel={labels.clear}
          onSelect={() => setActive("end")}
          onCommit={d => commitTyped("end", d)}
          onClear={value?.to ? () => clear("end") : undefined}
          autoFocus={initialActive === "end"}
        />
      </div>
      {withTime && (
        <div className="grid w-0 min-w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
          <TimeInput
            label={labels.start}
            value={value?.from}
            onChange={hhmm => emit({ from: value?.from ? applyHHMM(value.from, hhmm) : undefined, to: value?.to })}
          />
          <TimeInput
            label={labels.end}
            value={value?.to}
            onChange={hhmm => emit({ from: value?.from, to: value?.to ? applyHHMM(value.to, hhmm) : undefined })}
          />
        </div>
      )}
      <DragContext.Provider value={drag.api}>
        <Calendar
          mode="range"
          selected={calendarSelected(value)}
          // `onSelect` (even a noop) puts the calendar in CONTROLLED mode so the
          // range display always mirrors `selected`. Without it react-day-picker
          // keeps its own internal selection, which doesn't re-collapse when
          // `selected` shrinks (e.g. clearing one endpoint) — the highlight would
          // stick to the stale range. Real picks still flow through onDayClick.
          onSelect={() => {}}
          onDayClick={pickDay}
          defaultMonth={defaultMonth ?? value?.from ?? value?.to}
          disabled={disabledDates}
          numberOfMonths={numberOfMonths}
          components={DAY_BUTTON_OVERRIDE}
          className="p-0"
        />
      </DragContext.Provider>
    </div>
  );
}
