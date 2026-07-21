import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

// A small pill-style segmented control: a bordered row of buttons with a
// highlight3 indicator that slides to the active segment. Callers pass
// already-localized option labels. `testId` / `optionTestId` are optional e2e
// hooks (the budgets view toggle relies on them; other callers omit them).
export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  testId,
  optionTestId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ id: T; label: string }>;
  testId?: string;
  optionTestId?: (id: T) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex(o => o.id === value)
  );

  useLayoutEffect(() => {
    const button = containerRef.current?.getElementsByTagName("button")[selectedIndex];
    if (!button) return;
    setIndicator({ left: button.offsetLeft, width: button.offsetWidth });
  }, [selectedIndex, options]);

  return (
    <div ref={containerRef} data-testid={testId} className="relative flex -space-x-1 rounded-full border p-0.5">
      {indicator && (
        <div
          aria-hidden
          className="absolute top-0.5 bottom-0.5 rounded-full bg-highlight1 transition-all duration-200 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          data-testid={optionTestId?.(o.id)}
          onClick={() => onChange(o.id)}
          aria-selected={value === o.id}
          className={cn(
            "relative z-10 rounded-full px-[0.75em] py-[0.25em] text-base font-medium transition-colors duration-150",
            "text-text-3 hover:text-text-1 aria-selected:text-text-1",
            "hover:bg-highlight3"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
