import { SectionTitle } from "./SectionTitle";
export function TrackerDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border bg-surface-1 p-6">
        <SectionTitle className="mb-2">Mission status</SectionTitle>
        <div className="text-xl font-semibold tracking-tight text-text-1">Nominal</div>
      </div>
      <div className="rounded-lg border bg-surface-1 p-6">
        <SectionTitle className="mb-2">Velocity</SectionTitle>
        <div className="font-mono text-xl font-semibold text-accent-1">7,847 m/s</div>
      </div>
      <div className="rounded-lg border bg-surface-1 p-6">
        <SectionTitle className="mb-2">Apoapsis</SectionTitle>
        <div className="font-mono text-xl font-semibold text-text-1">412.3 km</div>
      </div>
    </div>
  );
}
