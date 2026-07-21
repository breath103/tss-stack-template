import { type ReactNode, useState } from "react";

import { type IconComponent } from "../icon";
import { OptionList } from "./OptionList";

// A search box over an options list — the body of a value <Picker> (objective
// track, objective parent/blocks editors, project switcher). Options are
// `{ id, label }`; single-select picks one and closes.
//
// `onPick` may be async (e.g. the project switcher moves the task): OptionList
// shows a spinner on the picked row and disables the rest until it resolves, and
// keeps the popover open if `onPick` returns `false` (a failure keeps the choices
// — and the `footer` error — visible).
export function SearchSelectContent<T extends { id: string; label: string }>({
  options,
  value = null,
  onPick,
  searchPlaceholder,
  emptyLabel,
  noneLabel,
  rowIcon,
  footer,
}: {
  options: readonly T[];
  /** Highlighted/checked id. Omit for an action list with no current value. */
  value?: string | null;
  /** Pick an option (`null` via the none row). Return `false` to keep the
   *  popover open (e.g. an async action failed); anything else closes it. */
  onPick: (id: string | null) => boolean | void | Promise<boolean | void>;
  searchPlaceholder: string;
  emptyLabel: string;
  /** Adds a leading row that picks `null` (clear / none). */
  noneLabel?: string;
  /** A constant leading icon for every row (all options share a kind). */
  rowIcon?: IconComponent;
  /** Rendered under the list — e.g. an async error message. */
  footer?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = needle ? options.filter(o => o.label.toLowerCase().includes(needle)) : options;
  const labelOf = new Map(options.map(o => [o.id, o.label]));

  return (
    // Wide — options are often full objective paths.
    <div className="w-80">
      <OptionList
        options={filtered.map(o => o.id)}
        value={value}
        onChange={onPick}
        label={id => ({ icon: rowIcon, text: labelOf.get(id) })}
        noneLabel={noneLabel}
        empty={emptyLabel}
        searchPlaceholder={searchPlaceholder}
        search={query}
        onSearch={setQuery}
      />
      {footer}
    </div>
  );
}
