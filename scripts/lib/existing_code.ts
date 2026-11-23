import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * What the React trees already have that a new component or i18n label may duplicate: guide
 * "Rendering a row, card or label for an entity". Used by `find_existing.ts` before writing
 * and by `recheck_guides.ts` after.
 */
export class ExistingCode {
  static readonly TREES = ["packages/frontend/src", "modules/ui/src"];

  /** What a component is, not whose: a name sharing an entity word and one of these is the closest match. */
  private static readonly SHAPES = new Set(
    "row card item badge avatar label chip icon link cell line name option tile pill tag".split(" ")
  );
  /** Words that say nothing about which entity a component draws. */
  private static readonly GENERIC = new Set(
    (
      "page section layout list admin modal form button skeleton view panel pane detail header footer content body " +
      "title menu field input picker selector demo new edit create add table group container wrapper provider " +
      "context tab bar box text status state info summary preview empty loading error dialog popover setting app " +
      "with for of by and the screen step action control toolbar sidebar nav main root base default custom shared " +
      "common inner outer left right top bottom"
    ).split(" ")
  );
  private static readonly DECLARATION =
    /^(?:export\s+)?(?:default\s+)?(?:(?:async\s+)?function\s+|const\s+(?=[A-Z]\w*\b[^=\n]*=\s*(?:\(|<|memo\b|forwardRef\b|function\b|async\b)))([A-Z]\w*)/gm;

  static forRepo(): ExistingCode {
    return new ExistingCode(path.resolve(import.meta.dirname, "../.."));
  }

  private componentIndex: { name: string; file: string; line: number }[] | null = null;
  private labelIndex: Map<string, { key: string; file: string }[]> | null = null;

  constructor(private readonly root: string) {}

  /** Function components declared at the top level of a `.tsx` file's text, exported or not. */
  static declaredComponents(content: string): { name: string; line: number }[] {
    return [...content.matchAll(ExistingCode.DECLARATION)]
      .map(match => ({ name: match[1], line: content.slice(0, match.index).split("\n").length }))
      .filter(({ name }) => /[a-z]/.test(name));
  }

  /** Every string under `en` of an i18n dict's text, as `key.path` and value. */
  static enLabels(content: string): { key: string; value: string }[] {
    const walk = (value: unknown, key: string): { key: string; value: string }[] => {
      if (typeof value === "string") return [{ key, value }];
      if (typeof value !== "object" || value === null) return [];
      return Object.entries(value).flatMap(([name, child]) => walk(child, key === "" ? name : `${key}.${name}`));
    };
    return walk((JSON.parse(content) as { en?: unknown }).en, "");
  }

  /**
   * Components in other files that share an entity word with `name`, closest first: same name,
   * then same entity and shape (`ToolsListRow` for `ConnectedToolRow`), then same entity.
   * `skip` = `file:name` keys that are not candidates (the session's own new components).
   * `close` = likely the same thing drawn twice: same name, same entity and shape, or two shared
   * entity words. Sharing one word alone (`ToolPane` for `ConnectedToolRow`) is not.
   */
  similarComponents(name: string, ownFile: string | null, skip: Set<string> = new Set()) {
    const own = ExistingCode.words(name);
    if (own.entities.length === 0) return [];
    return this.components()
      .filter(candidate => candidate.file !== ownFile && !skip.has(`${candidate.file}:${candidate.name}`))
      .flatMap(candidate => {
        const theirs = ExistingCode.words(candidate.name);
        const shared = own.entities.filter(word => theirs.entities.includes(word)).length;
        if (shared === 0) return [];
        const sameShape = own.shapes.some(word => theirs.shapes.includes(word));
        const score =
          (candidate.name === name ? 100 : 0) + (sameShape ? 10 : 0) + shared * 4 - (theirs.entities.length - shared);
        return [{ ...candidate, score, close: candidate.name === name || sameShape || shared >= 2 }];
      })
      .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  }

  /**
   * Entity-named components (`InvitationRow`, not `Row` or `Section`) declared in more than one
   * file. Left out: `routes/$index/` (the landing page draws mock-ups of the app's own screens)
   * and `components/widgets/` (each tool's folder implements the same view names).
   */
  duplicateComponents(): { name: string; places: string[] }[] {
    const places = new Map<string, string[]>();
    for (const { name, file, line } of this.components()) {
      const exempt = file.includes("/routes/$index/") || file.includes("/components/widgets/");
      if (exempt || ExistingCode.words(name).entities.length === 0) continue;
      places.set(name, [...(places.get(name) ?? []), `${file}:${line}`]);
    }
    return [...places]
      .filter(([, found]) => new Set(found.map(place => place.split(":")[0])).size > 1)
      .map(([name, found]) => ({ name, places: found }));
  }

  /**
   * Keys in other i18n files whose `en` value is this text, case and outer spaces aside. Files
   * whose path shares the most words with `ownFile` come first (`Tools.i18n.json` for a label
   * added under `settings/tools/`).
   */
  sameLabel(value: string, ownFile: string | null): { key: string; file: string }[] {
    const pathWords = (file: string) => new Set(file.toLowerCase().match(/[a-z0-9]+/g) ?? []);
    const own = pathWords(ownFile ?? "");
    const nearness = (file: string) => [...pathWords(file)].filter(word => own.has(word)).length;
    return (this.labels().get(value.trim().toLowerCase()) ?? [])
      .filter(entry => entry.file !== ownFile)
      .sort((a, b) => nearness(b.file) - nearness(a.file) || a.file.localeCompare(b.file));
  }

  /** i18n keys, in any file, whose last segment contains `word`. */
  labelKeysNamed(word: string): { key: string; file: string; value: string }[] {
    const wanted = word.toLowerCase();
    return [...this.labels()].flatMap(([value, entries]) =>
      entries
        .filter(entry => (entry.key.split(".").at(-1) ?? "").toLowerCase().includes(wanted))
        .map(entry => ({ ...entry, value }))
    );
  }

  private static words(name: string): { entities: string[]; shapes: string[] } {
    const words = (name.match(/[A-Z][a-z0-9]+|[A-Z]+(?![a-z])/g) ?? []).map(word => {
      const lower = word.toLowerCase();
      if (lower.endsWith("ies")) return `${lower.slice(0, -3)}y`;
      return lower.length > 3 && lower.endsWith("s") && !lower.endsWith("ss") ? lower.slice(0, -1) : lower;
    });
    return {
      shapes: words.filter(word => ExistingCode.SHAPES.has(word)),
      entities: words.filter(word => !ExistingCode.SHAPES.has(word) && !ExistingCode.GENERIC.has(word)),
    };
  }

  private components(): { name: string; file: string; line: number }[] {
    this.componentIndex ??= this.files(".tsx").flatMap(file =>
      ExistingCode.declaredComponents(readFileSync(path.join(this.root, file), "utf8")).map(found => ({
        ...found,
        file,
      }))
    );
    return this.componentIndex;
  }

  private labels(): Map<string, { key: string; file: string }[]> {
    if (this.labelIndex !== null) return this.labelIndex;
    const index = new Map<string, { key: string; file: string }[]>();
    for (const file of this.files(".i18n.json")) {
      for (const { key, value } of ExistingCode.enLabels(readFileSync(path.join(this.root, file), "utf8"))) {
        const text = value.trim().toLowerCase();
        index.set(text, [...(index.get(text) ?? []), { key, file }]);
      }
    }
    this.labelIndex = index;
    return index;
  }

  private files(suffix: string): string[] {
    const walk = (dir: string): string[] =>
      readdirSync(path.join(this.root, dir), { withFileTypes: true }).flatMap(entry => {
        const file = `${dir}/${entry.name}`;
        if (entry.isDirectory()) return entry.name === "node_modules" || entry.name === "__tests__" ? [] : walk(file);
        return entry.name.endsWith(suffix) && !entry.name.includes(".test.") ? [file] : [];
      });
    return ExistingCode.TREES.flatMap(walk);
  }
}
