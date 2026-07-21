import { useDateFormatter } from "../i18n/I18nContext";
import type { DateFormatType } from "../lib/date-formatter";

// Render-time shorthand for `useDateFormatter()` — drops the hook wiring when
// the formatted string goes straight into JSX. When the string is needed
// outside rendering (keys, attributes, exports), use the hook.
export function FormattedDate({ date, format }: { date: Date; format: DateFormatType }) {
  const formatter = useDateFormatter();
  return formatter.format(date, format);
}
