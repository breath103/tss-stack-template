import { Button } from "@ui/components/Button";
import { ResizableDrawer } from "@ui/components/ResizableDrawer";
import { ResizableWidthStore } from "@ui/components/resizable-width";
import { AnimatePresence } from "motion/react";
import { useState } from "react";

const demoWidthStore = new ResizableWidthStore({
  defaultWidth: 280,
  minWidth: 200,
  maxWidth: 420,
  storageKey: "tss:designResizableDrawerWidth",
});

export function ResizableDrawerDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col gap-3">
      <Button
        size="m"
        text={open ? "Close drawer" : "Open drawer"}
        className="self-start"
        onClick={() => setOpen(!open)}
      />
      <div className="flex h-64 overflow-hidden rounded-md border bg-surface-2">
        <div className="flex-1 p-4 text-base text-text-3">
          Content area — the in-flow drawer pushes this aside. Overlay it instead with `className="absolute inset-y-0
          right-0"` on a relative parent.
        </div>
        <AnimatePresence>
          {open && (
            <ResizableDrawer resizeLabel="Resize drawer" store={demoWidthStore}>
              <div className="p-4 text-base">Drawer body — drag the left edge to resize.</div>
            </ResizableDrawer>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
