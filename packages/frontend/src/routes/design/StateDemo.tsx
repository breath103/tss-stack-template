import { SectionTitle } from "./SectionTitle";
export function StateDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-error/40 bg-error/10 p-4">
        <SectionTitle className="mb-1 text-error">Anomaly</SectionTitle>
        <div className="text-text-1">Telemetry packet loss exceeded 0.5%. Hold for diagnostic.</div>
      </div>
      <div className="rounded-lg border border-success/40 bg-success/10 p-4">
        <SectionTitle className="mb-1 text-success">Confirmed</SectionTitle>
        <div className="text-text-1">Stage separation nominal. Coast phase initiated.</div>
      </div>
      <div className="rounded-lg bg-error p-4">
        <SectionTitle className="mb-1 text-error-fg/80">Solid error</SectionTitle>
        <div className="font-medium text-error-fg">Abort. Abort. Abort.</div>
      </div>
      <div className="rounded-lg bg-success p-4">
        <SectionTitle className="mb-1 text-success-fg/80">Solid success</SectionTitle>
        <div className="font-medium text-success-fg">All systems nominal.</div>
      </div>
    </div>
  );
}
