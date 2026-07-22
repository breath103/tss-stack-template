import * as React from "react";

import { cn } from "../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-border bg-input px-3 py-2 text-base text-text-1 shadow-sm focus-input transition-[color,box-shadow] placeholder:text-text-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-error/20 md:text-sm dark:aria-invalid:ring-error/40",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
