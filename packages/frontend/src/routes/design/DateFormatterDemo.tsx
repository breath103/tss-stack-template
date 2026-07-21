import { type DateFormatType, DateFormatter } from "@ui/lib/date-formatter";

const TYPES: DateFormatType[] = ["year-date", "year-date-time", "date", "date-time", "time"];
const EN = new DateFormatter("en");
const KO = new DateFormatter("ko");

export function DateFormatterDemo() {
  const sample = new Date(2026, 6, 4, 15, 8);
  return (
    <div className="rounded-lg border bg-surface-1 p-6">
      <table className="w-full text-data text-base">
        <thead>
          <tr className="border-b text-left text-sm tracking-wider text-text-3 uppercase">
            <th className="py-2 pr-6 font-medium">Format</th>
            <th className="py-2 pr-6 font-medium">en</th>
            <th className="py-2 font-medium">ko</th>
          </tr>
        </thead>
        <tbody>
          {TYPES.map(type => (
            <tr key={type} className="border-b last:border-b-0">
              <td className="py-2 pr-6 text-text-3">"{type}"</td>
              <td className="py-2 pr-6 text-text-1">{EN.format(sample, type)}</td>
              <td className="py-2 text-text-1">{KO.format(sample, type)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
