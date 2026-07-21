import { cn } from "../lib/utils";

// bg-text-3/30, NOT bg-surface-*. surface-2 is lighter than the row bg in
// light mode and renders invisible.
// A span (display:block by default) rather than a div so a skeleton is also
// valid inside phrasing content — e.g. an inline chip loading in a comment's
// <p>. Callers needing inline flow override with `inline-block`.
function Skeleton({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="skeleton" className={cn("block animate-pulse rounded-md bg-text-3/30", className)} {...props} />
  );
}

export { Skeleton };
