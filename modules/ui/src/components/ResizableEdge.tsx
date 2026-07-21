import type { PointerEvent as ReactPointerEvent } from "react";
import { memo, useCallback, useRef } from "react";

import { useOnChange } from "../hooks/useOnChange";
import { cn } from "../lib/utils";

import { clampResizableWidth, type ResizableWidthStore } from "./resizable-width";

const identityWidthDelta = (pixelDelta: number) => pixelDelta;

export const ResizableEdge = memo(function ResizableEdge({
  ariaLabel,
  className,
  edge,
  initialWidth,
  onResize,
  onResizeEnd,
  pixelsToWidthDelta,
  store,
}: {
  ariaLabel: string;
  className?: string;
  edge: "left" | "right";
  initialWidth: number;
  onResize: (width: number) => void;
  onResizeEnd?: (width: number) => void;
  pixelsToWidthDelta?: (pixelDelta: number) => number;
  store: ResizableWidthStore;
}) {
  const handleRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef(initialWidth);
  const toWidthDelta = pixelsToWidthDelta ?? identityWidthDelta;

  useOnChange(() => {
    widthRef.current = initialWidth;
    handleRef.current?.setAttribute("aria-valuenow", String(initialWidth));
  }, [initialWidth]);

  const applyWidth = useCallback(
    (width: number) => {
      const next = clampResizableWidth(width, store);
      widthRef.current = next;
      onResize(next);
      handleRef.current?.setAttribute("aria-valuenow", String(next));
      return next;
    },
    [store, onResize]
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startWidth = widthRef.current;
      const onMove = (ev: PointerEvent) => {
        const pixelDelta = edge === "left" ? startX - ev.clientX : ev.clientX - startX;
        applyWidth(startWidth + toWidthDelta(pixelDelta));
      };
      const onEnd = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        onResizeEnd?.(widthRef.current);
        store.save(widthRef.current);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [applyWidth, edge, onResizeEnd, store, toWidthDelta]
  );

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuemin={store.minWidth}
      aria-valuemax={store.maxWidth}
      aria-valuenow={initialWidth}
      onPointerDown={onPointerDown}
      onClick={e => e.stopPropagation()}
      className={cn(
        "group absolute inset-y-0 flex w-2 cursor-col-resize justify-center",
        edge === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
        className
      )}
    >
      <span className="block h-full w-px bg-border transition-all duration-150 group-hover:w-0.5 group-hover:bg-accent-1 group-active:w-1 group-active:bg-accent-1" />
    </div>
  );
});
