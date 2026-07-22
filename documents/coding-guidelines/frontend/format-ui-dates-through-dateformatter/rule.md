# Format UI dates through DateFormatter

Every user-facing date/time goes through the shared `DateFormatter`
(`@ui/lib/date-formatter`) — never `toLocale*String(locale, …)`,
`new Intl.DateTimeFormat(…)`, or a raw `date-fns` `format()` at the callsite.
Centralizing formats keeps every screen consistent and locale-correct (the
formatter carries per-locale patterns for `en`/`ko`), and makes a format change a
one-line edit instead of a codebase-wide grep. The `local/no-manual-date-format`
oxlint rule enforces this.

`DateFormatter` is constructed with a locale and exposes `.format(date, type)`,
where `type` is one of `year-date`, `year-date-time`, `year-date-time-seconds`,
`date`, `date-time`, `time`, `month`.

```tsx
// ✅ In a component — construct from the app's current locale
import { DateFormatter } from "@ui/lib/date-formatter";
import { useLocale } from "@/contexts/I18nContext";

function Row({ at }: { at: string }) {
  const df = new DateFormatter(useLocale());
  return <span>{df.format(new Date(at), "date-time")}</span>;
}
```

```ts
// ✅ In a pure helper (no hooks) — take the locale as a parameter
import { DateFormatter, type DateFormatType } from "@ui/lib/date-formatter";
import type { Locale } from "@/contexts/I18nContext";

export function label(at: string, locale: Locale, type: DateFormatType = "date") {
  return new DateFormatter(locale).format(new Date(at), type);
}
```

```tsx
// ❌ Wrong — manual formatting at the callsite
new Date(at).toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
new Intl.DateTimeFormat("en", { hour: "2-digit" }).format(d);
```

If an app mounts the shared `@ui/i18n/I18nContext`, prefer its `useDateFormatter()`
hook, which wires the formatter to the current locale for you. An app that keeps
its own i18n context (as above) constructs `new DateFormatter(useLocale())`
directly — that is the app-level bridge, and it satisfies the rule.
