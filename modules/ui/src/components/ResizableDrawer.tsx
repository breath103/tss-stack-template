import { type HTMLMotionProps, motion } from "motion/react";
import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import { cn } from "../lib/utils";
import { ResizableEdge } from "./ResizableEdge";
import type { ResizableWidthStore } from "./resizable-width";

// Right-hand drawer with a persisted resizable width. In-flow by default
// (the page body pushes aside); pass positioning classes via `className`
// (e.g. `absolute inset-y-0 right-0`) to overlay the content instead. Width
// hydrates from the store once; ResizableEdge mutates the live <aside>'s
// width during drag (no per-pixel re-render) and persists on drag-end.
// Mobile: full-screen overlay sliding up, no resize handle — same DOM tree,
// only positioning, width, the handle, and the slide direction differ.
// Mount inside AnimatePresence — enter/exit slide is built in.
export function ResizableDrawer({
  resizeLabel,
  store,
  className,
  children,
}: {
  resizeLabel: string;
  store: ResizableWidthStore;
  className?: string;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const drawerRef = useRef<HTMLElement | null>(null);
  const initialWidth = useMemo(() => store.read(), [store]);
  const applyWidth = useCallback((width: number) => {
    drawerRef.current?.style.setProperty("width", `${width}px`);
  }, []);

  const motionProps: Pick<HTMLMotionProps<"aside">, "initial" | "animate" | "exit"> = isMobile
    ? {
        initial: { y: "100%", opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
        exit: { y: "100%", opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
      }
    : {
        initial: { x: 24, opacity: 0 },
        animate: { x: 0, opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
        exit: { x: 24, opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
      };

  return (
    <motion.aside
      ref={drawerRef}
      // `relative` is the positioning context for ResizableEdge's left-edge handle.
      className={cn(
        "relative flex shrink-0 flex-col border-l bg-surface-1 shadow-xl",
        className,
        "mobile:fixed mobile:inset-0 mobile:z-50 mobile:w-auto mobile:border-l-0"
      )}
      style={isMobile ? undefined : { width: initialWidth }}
      {...motionProps}
    >
      {!isMobile && (
        <ResizableEdge
          ariaLabel={resizeLabel}
          className="z-20"
          edge="left"
          initialWidth={initialWidth}
          onResize={applyWidth}
          store={store}
        />
      )}
      {children}
    </motion.aside>
  );
}
