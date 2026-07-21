import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

// Generic popover wrapper: pairs a `trigger` with lazily-mounted `content`, so
// callers stop rewriting the Popover/Trigger/Content boilerplate for every
// picker. Radix unmounts closed content, so any data loading inside `content`
// (users list, member ids, …) only fires once the popover opens — encapsulate
// that loading in the content component to keep it off the mount path.
//
// `value` / `onChange` belong on the content, not here — Picker only owns
// open/close. `trigger` is passed straight through `asChild`, so it must be a
// single element that forwards a ref (e.g. a `<button>`); style/size/aria and
// any `stopPropagation` live on that element. Content closes the popover via
// `usePickerClose()` (single-select closes on pick; multi-select just stays
// open by not calling it).

const PickerCloseContext = createContext<() => void>(() => {});

/** Close the enclosing Picker popover. No-op outside a Picker. */
export function usePickerClose(): () => void {
  return useContext(PickerCloseContext);
}

export function Picker({
  trigger,
  content,
  defaultOpen = false,
}: {
  trigger: ReactNode;
  content: ReactNode;
  /** Open on mount — e.g. a filter chip that was just added. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const close = useMemo(() => () => setOpen(false), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" onClick={e => e.stopPropagation()}>
        <PickerCloseContext.Provider value={close}>{content}</PickerCloseContext.Provider>
      </PopoverContent>
    </Popover>
  );
}
