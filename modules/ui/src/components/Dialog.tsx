import { X } from "@phosphor-icons/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";
import { useI18n } from "../i18n/I18nContext";
import { cn } from "../lib/utils";
import dict from "./Dialog.i18n.json";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        // surface
        "fixed inset-0 z-50 bg-overlay",
        // exit
        "data-[state=closed]:animate-out data-[state=closed]:duration-150 data-[state=closed]:fade-out-0",
        // enter
        "data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const i18n = useI18n(dict);

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // layout
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-[-50%] gap-4",
          // surface
          "rounded-lg border bg-background p-6 shadow-lg outline-none",
          // exit
          "data-[state=closed]:animate-out data-[state=closed]:duration-150 data-[state=closed]:fade-out-0",
          "data-[state=closed]:zoom-out-95",
          // enter
          "data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          // responsive
          "sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              // position
              "absolute top-4 right-4 rounded-sm",
              // resting
              "opacity-70 ring-offset-background transition-all duration-150",
              // hover
              "hover:opacity-100",
              // focus
              "focus:ring-2 focus:ring-accent-1 focus:ring-offset-2 focus:outline-hidden",
              // active / disabled
              "active:scale-[0.95] disabled:pointer-events-none",
              // open state
              "data-[state=open]:bg-highlight2 data-[state=open]:text-text-3",
              // icon
              "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            )}
          >
            <X />
            <span className="sr-only">{i18n.close}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-text-3", className)} {...props} />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle };
