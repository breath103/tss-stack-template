import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { cn } from "../lib/utils";

function Popover({ modal = true, ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" modal={modal} {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  backdrop = false,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  backdrop?: boolean;
}) {
  return (
    <>
      {backdrop && (
        <PopoverPrimitive.Portal>
          <div
            data-slot="popover-backdrop"
            className="fixed inset-0 z-40 bg-overlay data-[state=closed]:animate-out data-[state=closed]:duration-150 data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0"
          />
        </PopoverPrimitive.Portal>
      )}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="popover-content"
          align={align}
          sideOffset={sideOffset}
          className={cn(
            // surface
            "z-50 origin-(--radix-popover-content-transform-origin) rounded-md border bg-surface-2 text-text-1 shadow-md outline-hidden",
            // enter / exit
            "data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:duration-150 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            // slide direction, per side
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            "data-[side=bottom]:data-[state=closed]:slide-out-to-top-2 data-[side=left]:data-[state=closed]:slide-out-to-right-2 data-[side=right]:data-[state=closed]:slide-out-to-left-2 data-[side=top]:data-[state=closed]:slide-out-to-bottom-2",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    </>
  );
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
