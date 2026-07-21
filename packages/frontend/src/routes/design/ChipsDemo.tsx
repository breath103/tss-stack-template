import { Chip } from "@ui/components/Chip";

const CHIP_COLORS = [
  "gray",
  "blue",
  "mint",
  "purple",
  "green",
  "red",
  "rose",
  "sky",
  "indigo",
  "amber",
  "emerald",
] as const;

export function ChipsDemo() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {CHIP_COLORS.map(c => (
          <Chip key={c} color={c}>
            {c}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {CHIP_COLORS.map(c => (
          <Chip key={c} color={c} onDismiss={() => {}}>
            dismissable
          </Chip>
        ))}
      </div>
    </div>
  );
}
