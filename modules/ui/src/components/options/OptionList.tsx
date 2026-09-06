import { type ReactNode, useRef, useState } from "react";
import { useOnChange } from "../../hooks/useOnChange";
import { cn } from "../../lib/utils";
import { usePickerClose } from "../Picker";
import { Skeleton } from "../Skeleton";
import { Spinner } from "../Spinner";
import { Tooltip } from "../Tooltip";
import { OptionLabel, type TextLabel } from "./OptionLabel";
import { OptionRow } from "./OptionRow";
import { SearchField } from "./SearchField";

const SKELETON_ROWS = [0, 1, 2];
const NAV_KEYS = ["ArrowDown", "ArrowUp", "Home", "End"];

// The option list every Picker shares: it owns select semantics (single closes
// on pick, multi toggles and stays open), the selected-set, gating, roving
// keyboard focus, and the search / loading / empty / error chrome. Pass
// `searchPlaceholder` (and the controlled `search` value) to show a search box —
// the caller still owns filtering and hands in the already-filtered `options`.
export function OptionList<T extends string>(
  props: {
    options: readonly T[];
    label: (value: T) => TextLabel | ReactNode;
    /**
     * `false` selectable, `true` disabled, a string disabled with that reason shown in a
     * per-row tooltip. The tooltip is one Radix Root per row, so a string is only for lists
     * bounded by a const vocabulary (statuses, ≤ a handful); an unbounded list (people)
     * returns a boolean and surfaces its reason through `accessory` instead — see
     * don-t-attach-radix-primitives-per-list-item.
     */
    optionDisabled?: (value: T) => string | boolean;
    /** Right-aligned per-row node (a "not a member" tag on a dimmed row). */
    accessory?: (value: T) => ReactNode;
    loading?: boolean;
    error?: string | null;
    empty: string;
    /** A leading row that clears the selection (single-select only). */
    noneLabel?: string;
    /** Shows a search box; the caller filters and passes filtered `options`. */
    searchPlaceholder?: string;
    search?: string;
    onSearch?: (query: string) => void;
  } & (
    | {
        multiple?: false;
        value: T | null;
        /** Return `false` to keep the popover open (e.g. an async action failed);
         *  a Promise shows a spinner on the picked row until it resolves. */
        onChange: (value: T | null) => void | boolean | Promise<void | boolean>;
      }
    | { multiple: true; value: readonly T[]; onChange: (value: T[]) => void }
  )
) {
  const { options, label, optionDisabled, accessory, loading = false, error = null, empty } = props;
  const close = usePickerClose();
  const [pending, setPending] = useState<T | null>(null);
  const busy = pending !== null;

  const selected = new Set(props.multiple ? props.value : props.value === null ? [] : [props.value]);

  const pick = (value: T | null) => {
    if (busy) return;
    if (props.multiple) {
      if (value === null) return;
      props.onChange(selected.has(value) ? props.value.filter(v => v !== value) : [...props.value, value]);
      return;
    }
    const result = props.onChange(value);
    if (result instanceof Promise) {
      setPending(value);
      void result.then(r => {
        setPending(null);
        if (r !== false) close();
      });
    } else if (result !== false) {
      close();
    }
  };

  // Roving keyboard focus over the selectable rows. `focused` is an index into
  // `navigable`; the effect below imperatively focuses that row's button.
  const navigable = options.filter(v => (optionDisabled?.(v) ?? false) === false);
  const rowRefs = useRef(new Map<T, HTMLButtonElement>());
  const [focused, setFocused] = useState<number | null>(null);
  useOnChange(() => {
    const el = focused === null ? undefined : rowRefs.current.get(navigable[focused]);
    el?.focus();
    // Native focus() alone doesn't scroll the nearest scrollable ancestor when
    // the row lands outside the `max-h-56` viewport.
    el?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!NAV_KEYS.includes(e.key) || navigable.length === 0) return;
    e.preventDefault();
    const last = navigable.length - 1;
    const i = focused ?? -1;
    setFocused(
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowDown"
            ? i >= last
              ? 0
              : i + 1
            : i <= 0
              ? last
              : i - 1
    );
  };

  return (
    <div onKeyDown={onKeyDown}>
      {props.searchPlaceholder !== undefined && (
        <SearchField
          value={props.search ?? ""}
          onChange={props.onSearch ?? (() => {})}
          placeholder={props.searchPlaceholder}
        />
      )}
      {/* grid: the column track sizes to the widest row and every row stretches
          to it, so the hover wash spans full width even when it scrolls sideways. */}
      <div className="grid max-h-56 overflow-auto p-1">
        {props.noneLabel !== undefined && !props.multiple && (
          <OptionRow selected={props.value === null} disabled={busy} onSelect={() => pick(null)}>
            <span className="px-2 py-1.5 text-base text-text-3">{props.noneLabel}</span>
          </OptionRow>
        )}
        {(() => {
          if (options.length === 0) {
            if (loading) return SKELETON_ROWS.map(r => <Skeleton key={r} className="my-1 h-7 rounded-sm" />);
            const errored = error !== null;
            return (
              <p className={cn("px-2 py-6 text-center text-base", errored ? "text-error" : "text-text-3")}>
                {errored ? error : empty}
              </p>
            );
          }
          return options.map(value => {
            const gate = optionDisabled?.(value) ?? false;
            const reason = typeof gate === "string" ? gate : null;
            const isDisabled = gate !== false;
            const row = (
              <OptionRow
                key={value}
                ref={el => void (el ? rowRefs.current.set(value, el) : rowRefs.current.delete(value))}
                selected={selected.has(value)}
                check
                aria-disabled={isDisabled || undefined}
                disabled={busy && value !== pending}
                trailing={value === pending ? <Spinner className="size-3.5" /> : accessory?.(value)}
                onSelect={isDisabled ? undefined : () => pick(value)}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 truncate py-1.5 pl-2 text-base">
                  <OptionLabel label={label(value)} size="m" />
                </span>
              </OptionRow>
            );
            return reason === null ? (
              row
            ) : (
              <Tooltip key={value} label={reason} side="right" className="max-w-xs">
                {row}
              </Tooltip>
            );
          });
        })()}
      </div>
    </div>
  );
}
