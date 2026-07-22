import { Dialog as DialogPrimitive } from "radix-ui";
import { type ReactNode } from "react";

import { cn } from "../lib/utils";

export function Sheet({
  children,
  ...props
}: { children: ReactNode } & React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props}>{children}</DialogPrimitive.Root>;
}

export function SheetTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />;
}

export function SheetContent({
  className,
  side = "left",
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          // surface
          "fixed inset-0 z-50 bg-overlay",
          // exit
          "data-[state=closed]:animate-out data-[state=closed]:duration-150 data-[state=closed]:fade-out-0",
          // enter
          "data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0"
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          // surface
          "fixed inset-y-0 z-50 flex w-72 flex-col bg-background shadow-lg outline-none",
          // exit
          "data-[state=closed]:animate-out data-[state=closed]:duration-150",
          // enter
          "data-[state=open]:animate-in data-[state=open]:duration-200",
          // per side, left
          side === "left" && "left-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          // per side, right
          side === "right" && "right-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetClose = DialogPrimitive.Close;
