import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../lib/utils";

function Tabs({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  cn(
    // surface + layout
    "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-0.75 text-text-3",
    // per orientation, horizontal
    "group-data-[orientation=horizontal]/tabs:h-9",
    // per orientation, vertical
    "group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
    // line variant
    "data-[variant=line]:rounded-none"
  ),
  {
    variants: {
      variant: {
        default: "bg-surface-1",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // layout
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md",
        // border + spacing + type
        "border border-transparent px-2 py-1 font-medium whitespace-nowrap text-text-1/60 transition-all duration-150",
        // per orientation, vertical
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
        // hover
        "hover:text-text-1",
        // focus ring
        "focus-visible:border-accent-1 focus-visible:ring-[3px] focus-visible:ring-accent-1/50",
        // focus outline
        "focus-visible:outline-1 focus-visible:outline-accent-1",
        // disabled
        "disabled:pointer-events-none disabled:opacity-50",
        // active shadow, default variant
        "group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm",
        // active shadow, line variant
        "group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none",
        // dark text
        "dark:text-text-3 dark:hover:text-text-1",
        // svg
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // line variant, bg reset
        "group-data-[variant=line]/tabs-list:bg-transparent",
        // line variant, active bg
        "group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        // dark line variant, active border
        "dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent",
        // dark line variant, active bg
        "dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        // active bg + text
        "data-[state=active]:bg-background data-[state=active]:text-text-1",
        // dark active bg + text
        "dark:data-[state=active]:bg-border/30 dark:data-[state=active]:text-text-1",
        // pseudo underline base
        "after:absolute after:bg-text-1 after:opacity-0 after:transition-opacity",
        // horizontal underline, position
        "group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-1.25",
        // horizontal underline, size
        "group-data-[orientation=horizontal]/tabs:after:h-0.5",
        // vertical underline, position
        "group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1",
        // vertical underline, size
        "group-data-[orientation=vertical]/tabs:after:w-0.5",
        // active underline, line variant
        "group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
