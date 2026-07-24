import { cn } from "@ui/lib/utils";
import { Fragment } from "react";
import { SectionTitle } from "./SectionTitle";

export function TypographyDemo() {
  const sizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-xs"];
  // Each row shows the same sample at one size across the three text-color tokens,
  // so text-1/2/3 sit side by side for a direct contrast comparison.
  const colors = ["text-text-1", "text-text-2", "text-text-3"];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-x-4">
        <span />
        {colors.map(c => (
          <span key={c} className="pb-2 text-sm text-text-3">
            {c.replace("text-text-", "text-")}
          </span>
        ))}
        {sizes.map(s => (
          <Fragment key={s}>
            <span className="flex h-12 items-center border-b text-base text-text-3">{s}</span>
            {colors.map(c => (
              <span key={c} className={cn("flex h-12 min-w-0 items-center border-b", s, c)}>
                <span className="truncate">The quick brown fox jumps</span>
              </span>
            ))}
          </Fragment>
        ))}
      </div>

      <div className="rounded-lg bg-surface-2 p-6">
        <SectionTitle className="mb-2">Display font (marketing only)</SectionTitle>
        <div className="text-display text-xl text-text-1">TSS</div>
      </div>
      <div className="rounded-lg bg-surface-2 p-6">
        <SectionTitle className="mb-2">Mono / data</SectionTitle>
        <div className="text-data text-text-1">apollo-13.launch.timestamp = 1970-04-11T19:13:00Z</div>
      </div>
    </div>
  );
}
