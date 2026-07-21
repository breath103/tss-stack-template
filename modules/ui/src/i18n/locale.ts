import { z } from "zod";

import { LocalStoredValue } from "../lib/local-stored-value";

export type Locale = "en" | "ko";

const localeStore = new LocalStoredValue("locale", z.enum(["en", "ko"]));

// A URL ?locale= override persists to localStorage so subsequent reloads stay
// on the chosen locale without re-typing the URL.
export function detectLocale(): Locale {
  const override = new URLSearchParams(window.location.search).get("locale");
  if (override === "en" || override === "ko") {
    localeStore.save(override);
    return override;
  }
  const stored = localeStore.load();
  if (stored) return stored;
  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}
