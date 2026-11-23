import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { isEnabled, projectUses } from "shared/uses";

/** The coding guides under `documents/coding-guidelines/<group>/<slug>/rule.md`. */
export class Guides {
  /** The order topics are listed in. A guide's `topic:` frontmatter is one of these. */
  static readonly TOPICS = [
    "API routes",
    "Errors and fallbacks",
    "Untrusted input",
    "Repositories and services",
    "Migrations and tables",
    "Types and schemas",
    "Code structure",
    "Scripts and tests",
    "CSS and classNames",
    "Text and sizes",
    "Animation",
    "Loading and empty states",
    "Buttons and async actions",
    "Forms",
    "Data loading",
    "Components",
    "Hooks and state",
  ] as const;

  private static readonly FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;

  static forRepo(): Guides {
    return new Guides(path.resolve(import.meta.dirname, "../../documents/coding-guidelines"));
  }

  /** `<Topic>:` over its numbered titles, a blank line between topics. */
  static listing(guides: { number: number; topic: string; title: string }[]): string {
    return Guides.TOPICS.map(topic => guides.filter(guide => guide.topic === topic))
      .filter(inTopic => inTopic.length > 0)
      .map(inTopic => [`${inTopic[0].topic}:`, ...inTopic.map(guide => `${guide.number}. ${guide.title}`)].join("\n"))
      .join("\n\n");
  }

  constructor(private readonly root: string) {}

  /**
   * Numbered by topic in `TOPICS` order, then by `order:` inside the topic: `list_guides` and
   * `show_guides` must agree on what a number means.
   */
  all() {
    const uses = projectUses(this.root);
    return readdirSync(this.root, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .flatMap(group =>
        readdirSync(path.join(this.root, group.name)).map(name => ({
          slug: `${group.name}/${name}`,
          file: path.join(this.root, group.name, name, "rule.md"),
        }))
      )
      .filter(({ file }) => existsSync(file))
      .map(({ slug, file }) => ({ slug, ...Guides.parse(file) }))
      .filter(guide => isEnabled(guide.requires, uses))
      .sort(
        (a, b) =>
          Guides.TOPICS.indexOf(a.topic) - Guides.TOPICS.indexOf(b.topic) ||
          a.order - b.order ||
          a.slug.localeCompare(b.slug)
      )
      .map(({ slug, topic, title, body }, index) => ({ number: index + 1, slug, topic, title, body }));
  }

  pick(numbers: number[]) {
    const guides = this.all();
    const unknown = numbers.filter(number => !Number.isInteger(number) || number < 1 || number > guides.length);
    if (unknown.length > 0) {
      throw new Error(
        `No guide ${unknown.join(", ")}. Valid numbers are 1-${guides.length} (./scripts/list_guides.ts).`
      );
    }
    return numbers.map(number => guides[number - 1]);
  }

  private static parse(file: string) {
    const text = readFileSync(file, "utf8");
    const frontmatter = Guides.FRONTMATTER.exec(text);
    const fields = frontmatter?.[1] ?? "";
    const [heading, ...rest] = text
      .slice(frontmatter?.[0].length ?? 0)
      .trim()
      .split("\n");
    if (!heading.startsWith("# ")) throw new Error(`${file} must open with a "# <title>" line`);
    const declared = /^topic:\s*(.+)$/m.exec(fields)?.[1].trim();
    const topic = Guides.TOPICS.find(name => name === declared);
    if (topic === undefined) {
      throw new Error(
        `${file} needs "topic: <name>" in its frontmatter, got ${declared === undefined ? "none" : `"${declared}"`}. ` +
          `Topics: ${Guides.TOPICS.join(", ")}.`
      );
    }
    const order = Number(/^order:\s*(\d+)\s*$/m.exec(fields)?.[1]);
    if (!Number.isInteger(order)) {
      throw new Error(`${file} needs "order: <number>" in its frontmatter: its position among the "${topic}" guides.`);
    }
    const requires = /^requires:\s*(.+)$/m.exec(fields)?.[1];
    return {
      title: heading.slice(2).trim(),
      body: rest.join("\n").trim(),
      topic,
      order,
      requires: (requires ?? "")
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map(addOn => addOn.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean),
    };
  }
}
