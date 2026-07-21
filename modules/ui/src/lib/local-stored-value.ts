import superjson from "superjson";
import type { z } from "zod";

// A single typed slot in localStorage. The schema is the source of truth for
// what `T` actually is — drift, corruption, or a stale value from a previous
// app version safe-parses to a failure and evicts the entry. Reads never
// return malformed data; the slot fails closed instead of poisoning callers.
//
// superjson on the wire so Date / Map / Set / bigint round-trip without
// callers reconstituting them. For plain-JSON shapes the overhead is one
// extra wrapping key, no behaviour change.
export class LocalStoredValue<T> {
  constructor(
    private readonly key: string,
    private readonly schema: z.ZodType<T>
  ) {}

  load(): T | null {
    let raw: string | null;
    try {
      raw = localStorage.getItem(this.key);
    } catch {
      return null;
    }
    if (!raw) return null;

    // Try superjson first (the format save() writes). On failure, fall back to
    // plain JSON — handles values written before this slot was migrated to
    // LocalStoredValue (plain string, JSON.stringify, etc.). The schema gate
    // below is the safety net: anything that doesn't match the schema still
    // evicts, so a legacy read can't poison callers. The next save() rewrites
    // in superjson form, so the fallback fires at most once per slot per user.
    let parsed: unknown;
    try {
      parsed = superjson.parse(raw);
      if (parsed === undefined) throw new Error("superjson returned undefined");
    } catch {
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Plain string ("light", "en") — JSON.parse fails on bare words. Use
        // the raw value so enum schemas can validate it.
        parsed = raw;
      }
    }

    const result = this.schema.safeParse(parsed);
    if (!result.success) {
      this.clear();
      return null;
    }
    return result.data;
  }

  save(value: T): void {
    try {
      localStorage.setItem(this.key, superjson.stringify(value));
    } catch {
      /* quota / disabled storage — drop silently, the value is best-effort */
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* see save() */
    }
  }
}
