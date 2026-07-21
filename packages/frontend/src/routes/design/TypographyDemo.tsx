import { cn } from "@ui/lib/utils";
import { SectionTitle } from "./SectionTitle";

export function TypographyDemo() {
  const sizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-xs"];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[auto_1fr]">
        {sizes.map(s => (
          <div key={s} className="col-span-full grid h-12 grid-cols-subgrid gap-4 border-b">
            <span className="flex items-center text-base">{s}</span>
            <span className={cn("flex items-center", s)}>The quick brown fox jumps</span>
          </div>
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
