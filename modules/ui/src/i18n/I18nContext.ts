import { createContext, createElement, type ReactNode, useContext, useMemo, useState } from "react";

import { DateFormatter } from "../lib/date-formatter";

import type { Locale } from "./locale";
import { detectLocale } from "./locale";

export type { Locale };

const I18nContext = createContext<Locale | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale] = useState<Locale>(detectLocale);
  return createElement(I18nContext.Provider, { value: locale }, children);
}

export function useLocale(): Locale {
  const locale = useContext(I18nContext);
  if (!locale) throw new Error("useLocale must be used within I18nProvider");
  return locale;
}

// Same keys as the `en` catalog, but every string leaf free to hold a different
// literal per locale — so `en` fixes the shape and `ko` is checked for key
// parity, not value equality.
type SameShape<T> = { [K in keyof T]: T[K] extends object ? SameShape<T[K]> : string };

// Authoring wrapper for a colocated catalog. `const T` infers `en` as literals
// (so `format` can read placeholders off them — no `as const` needed), and
// `ko: SameShape<T>` makes a key mismatch between the locales a compile error at
// the definition site.
export function defineI18n<const T>(dict: { en: T; ko: SameShape<T> }) {
  return dict;
}

export function useI18n<T>(dict: { en: T; ko: SameShape<T> }): T {
  if (useLocale() === "ko") return dict.ko as T; // cast-ok: ko shares en's keys (SameShape); typed as T so placeholders resolve off the literal shape
  return dict.en;
}

export function useDateLocale(): string {
  return useLocale() === "ko" ? "ko-KR" : "en-US";
}

export function useDateFormatter(): DateFormatter {
  const locale = useLocale();
  return useMemo(() => new DateFormatter(locale), [locale]);
}
