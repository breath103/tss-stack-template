import { format } from "date-fns";

import type { Locale } from "../i18n/locale";

export type DateFormatType =
  | "year-date"
  | "year-date-time"
  | "year-date-time-seconds"
  | "date"
  | "date-time"
  | "time"
  | "month";

const FORMATS: Record<Locale, Record<DateFormatType, string>> = {
  en: {
    "year-date": "yyyy/MM/dd",
    "year-date-time": "yyyy/MM/dd HH:mm",
    "year-date-time-seconds": "yyyy/MM/dd HH:mm:ss",
    date: "MM/dd",
    "date-time": "MM/dd HH:mm",
    time: "HH:mm",
    month: "MMM",
  },
  ko: {
    "year-date": "yyyy. M. d.",
    "year-date-time": "yyyy. M. d. HH:mm",
    "year-date-time-seconds": "yyyy. M. d. HH:mm:ss",
    date: "M. d.",
    "date-time": "M. d. HH:mm",
    time: "HH:mm",
    month: "M월",
  },
};

// Every UI-facing date goes through a DateFormatter instance. `useDateFormatter()`
// wires an instance to the current locale from I18nContext; components then just
// call `.format(date, type)` without threading locale.
export class DateFormatter {
  constructor(private readonly locale: Locale) {}

  format(date: Date, type: DateFormatType): string {
    return format(date, FORMATS[this.locale][type]);
  }
}
