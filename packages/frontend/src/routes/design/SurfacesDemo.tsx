import { cn } from "@ui/lib/utils";
import { SectionTitle } from "./SectionTitle";

export function SurfacesDemo() {
  const swatches = [
    { name: "background", className: "bg-background", token: "var(--background)" },
    { name: "surface-1", className: "bg-surface-1", token: "var(--surface-1)" },
    { name: "surface-2", className: "bg-surface-2", token: "var(--surface-2)" },
    { name: "surface-muted", className: "bg-surface-muted", token: "var(--surface-muted)" },
  ];
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {swatches.map(s => (
          <div key={s.name} className="overflow-hidden rounded-lg border">
            <div className={cn("aspect-4/3 border-b", s.className)} />
            <div className="p-3">
              <div className="font-medium text-text-1">{s.name}</div>
              <div className="mt-1 font-mono text-sm text-text-3">{s.token}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-surface-1 p-6">
        <SectionTitle className="mb-3">Nesting</SectionTitle>
        <div className="rounded-lg border bg-surface-2 p-6">
          <div className="text-text-2">surface-2 card on surface-1 region</div>
          <div className="mt-4 rounded-md border bg-surface-2 p-4 shadow-lg">
            <div className="text-text-1">surface-2 popover/dialog layer</div>
          </div>
        </div>
      </div>
    </>
  );
}
