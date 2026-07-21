import { cn } from "@ui/lib/utils";
import { type ComponentProps } from "react";

// The "instrument eyebrow" section label: small, uppercase, wide-tracked, muted.
export function SectionTitle({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("text-sm font-medium tracking-widest text-text-3 uppercase", className)} {...props} />;
}
