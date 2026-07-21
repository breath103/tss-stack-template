import { Button } from "@ui/components/Button";
import { cn } from "@ui/lib/utils";
import { SectionTitle } from "./SectionTitle";

export function AccentsDemo() {
  const accents = [
    {
      n: "1",
      name: "Flight Blue",
      solid: "bg-accent-1",
      fg: "text-accent-1-fg",
      wash: "bg-accent-1/15 text-accent-1",
      textOn: "text-accent-1",
    },
    {
      n: "2",
      name: "Flare",
      solid: "bg-accent-2",
      fg: "text-accent-2-fg",
      wash: "bg-accent-2/15 text-accent-2",
      textOn: "text-accent-2",
    },
    {
      n: "3",
      name: "Mint Cyan",
      solid: "bg-accent-3",
      fg: "text-accent-3-fg",
      wash: "bg-accent-3/15 text-accent-3",
      textOn: "text-accent-3",
    },
  ] as const;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {accents.map(a => (
        <div key={a.n} className="overflow-hidden rounded-lg border bg-surface-1">
          <div className={cn("flex h-20 items-center justify-center", a.solid, a.fg)}>
            <span className="font-medium">accent-{a.n}</span>
          </div>
          <div className="p-4">
            <SectionTitle className={a.textOn}>{a.name}</SectionTitle>
            <div className={cn("mt-3 rounded-sm px-2 py-1 text-sm font-medium", a.wash)}>wash + text variant</div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant={`accent${a.n}`} size="m" text="Engage" />
              <Button size="m" text="Cancel" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
