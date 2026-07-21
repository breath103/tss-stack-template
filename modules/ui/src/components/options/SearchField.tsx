import { MagnifyingGlass } from "@phosphor-icons/react";

import { Input } from "../Input";

// The one search bar every picker shares. Autofocuses on mount so typing
// starts the moment the popover opens.
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex h-9 items-center gap-2 border-b bg-input px-3 focus-input">
      <MagnifyingGlass className="size-4 shrink-0 text-text-3" />
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onMount={el => el.focus()}
        chromeless
        type="search"
        // size={1}: don't let the input's intrinsic width widen the body.
        size={1}
        className="size-full bg-transparent text-base outline-none placeholder:text-text-3"
      />
    </div>
  );
}
