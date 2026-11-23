#!/usr/bin/env -S node --import tsx
// Re-check the coding guides once the code is written: the files this session changed, what
// already exists for a component or label it added, and the titles of the guides it has not
// been shown.
//
//   ./scripts/recheck_guides.ts           # print the re-check and record it for this diff
//   ./scripts/recheck_guides.ts --check   # the gate ci_local.ts and create-pr run: exit 1 when
//                                         # an agent's code change has had no re-check
import { parseArgs } from "node:util";

import { ExistingCode } from "./lib/existing_code.js";
import { type FileChange, GuideRecheck } from "./lib/guide_recheck.js";
import { Guides } from "./lib/guides.js";

const MAX_FILES_LISTED = 40;
// About five lines of code. Tokens, not lines: the formatter may rewrap the file between runs.
const SMALL_CHANGE_TOKENS = 60;
const SMALL_CHANGE_LINES_SHOWN = 8;
const MAX_EXISTING_LISTED = 12;
const MAX_MATCHES_PER_NAME = 4;

function printFiles(files: string[]): void {
  for (const file of files.slice(0, MAX_FILES_LISTED)) console.log(`  ${file}`);
  if (files.length > MAX_FILES_LISTED) console.log(`  … and ${files.length - MAX_FILES_LISTED} more`);
}

function printCapped(lines: string[]): void {
  for (const line of lines.slice(0, MAX_EXISTING_LISTED)) console.log(`  ${line}`);
  if (lines.length > MAX_EXISTING_LISTED) console.log(`  … and ${lines.length - MAX_EXISTING_LISTED} more`);
}

/** Components and i18n labels the session added that something elsewhere already covers. */
function printExisting(changes: FileChange[]): void {
  const inTrees = changes.filter(
    (change): change is FileChange & { after: string } =>
      change.after !== null && ExistingCode.TREES.some(tree => change.path.startsWith(`${tree}/`))
  );
  const existing = ExistingCode.forRepo();

  const added = inTrees
    .filter(change => change.path.endsWith(".tsx"))
    .flatMap(change => {
      const had = new Set(ExistingCode.declaredComponents(change.before ?? "").map(({ name }) => name));
      return ExistingCode.declaredComponents(change.after)
        .filter(({ name }) => !had.has(name))
        .map(({ name }) => ({ name, file: change.path }));
    });
  const own = new Set(added.map(({ name, file }) => `${file}:${name}`));
  const components = added
    .flatMap(({ name, file }) => {
      const matches = existing.similarComponents(name, file, own).filter(match => match.close);
      if (matches.length === 0) return [];
      const listed = matches.slice(0, MAX_MATCHES_PER_NAME).map(match => `${match.name} (${match.file}:${match.line})`);
      const more = matches.length > MAX_MATCHES_PER_NAME ? `, +${matches.length - MAX_MATCHES_PER_NAME} more` : "";
      return [{ score: matches[0].score, line: `${name} ↔ existing: ${listed.join(", ")}${more}` }];
    })
    .sort((a, b) => b.score - a.score)
    .map(({ line }) => line);

  const labels = inTrees
    .filter(change => change.path.endsWith(".i18n.json"))
    .flatMap(change => {
      const had = new Set(
        (change.before === null ? [] : ExistingCode.enLabels(change.before)).map(({ key, value }) => `${key}=${value}`)
      );
      return ExistingCode.enLabels(change.after)
        .filter(({ key, value }) => !had.has(`${key}=${value}`))
        .flatMap(({ key, value }) => {
          const matches = existing.sameLabel(value, change.path);
          if (matches.length === 0) return [];
          const more = matches.length > 2 ? `, +${matches.length - 2} more` : "";
          const listed = matches.slice(0, 2).map(match => `${match.key} (${match.file})`);
          return [`${key} "${value}" ↔ existing: ${listed.join(", ")}${more}`];
        });
    });

  if (components.length > 0) {
    console.log("\nALREADY EXISTS: components that draw the same entity as one you added.");
    console.log("Reuse or extend one. A different layout is a variant or a slot on the existing component,");
    console.log("not a second component. If it cannot be reused, say why in one line in your report.");
    printCapped(components);
  }
  if (labels.length > 0) {
    console.log("\nSAME LABEL ALREADY IN ANOTHER i18n FILE: use that key (move the map next to the shared");
    console.log("component if two pages need it) instead of adding a second copy.");
    printCapped(labels);
  }
}

function printTitles(recheck: GuideRecheck, guides: ReturnType<Guides["all"]>): void {
  const shown = recheck.shown();
  const unread = guides.filter(guide => !shown.includes(guide.slug));
  console.log(`\nGUIDES NOT SHOWN ON THIS BRANCH YET (${unread.length}).`);
  console.log('For each title: is its "When …" part something a line you added did?');
  console.log("Include lines copied from a neighbouring file. Show those guides and fix the code.");
  if (unread.length > 0) console.log(`\n${Guides.listing(unread)}`);
  const read = guides.filter(guide => shown.includes(guide.slug)).map(guide => guide.number);
  if (read.length > 0) {
    console.log(`\nAlready shown: ${read.join(",")}. Re-read any you are not sure you followed.`);
  }
  console.log("\nRun next: ./scripts/show_guides.ts <n>,<n>,… for every title that matches, then fix the code.");
}

function main(): void {
  const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } });
  const recheck = GuideRecheck.forRepo();

  if (values.check) {
    const failure = recheck.gateFailure();
    if (failure === null) return;
    console.error(failure);
    process.exit(1);
  }

  const guides = Guides.forRepo().all();
  const picked = recheck.pending();
  const pending = guides.filter(guide => picked.includes(guide.slug)).map(guide => guide.number);
  if (pending.length > 0) {
    console.log(
      `PICKED BUT NOT SHOWN: ${pending.join(",")}. Run next: ./scripts/show_guides.ts ${pending.join(",")}\n`
    );
  }

  const { sinceStart, repeat, changes, fresh, gainedTokens, newLines } = recheck.report();
  // `| head` closes the pipe mid-print (EPIPE): record first, or a truncated run never counts.
  recheck.recordRecheck();
  process.stdout.on("error", () => process.exit(0));

  const small = repeat && gainedTokens <= SMALL_CHANGE_TOKENS;
  if (!repeat) {
    const scope = sinceStart ? "since you started on this branch" : "against the merge-base with origin/main";
    console.log(`Code you changed, ${scope} (files: ${fresh.length}):`);
    printFiles(fresh);
  } else if (fresh.length === 0) {
    console.log(`Nothing changed since your last re-check (files already checked: ${changes.length}).`);
  } else {
    console.log(`Changed since your last re-check (files: ${fresh.length} of ${changes.length}):`);
    printFiles(fresh);
    if (small) {
      console.log(
        newLines.length === 0
          ? "A small change: code was only removed or reordered."
          : "A small change. Match the guide titles you know against the lines it added:"
      );
      for (const { path, line } of newLines.slice(0, SMALL_CHANGE_LINES_SHOWN)) {
        console.log(`  ${path}: ${line.slice(0, 200)}`);
      }
    }
  }

  printExisting(changes);

  if (small) {
    console.log(
      "\nThe list of guide titles is unchanged since your last re-check: ./scripts/list_guides.ts prints it."
    );
  } else {
    printTitles(recheck, guides);
  }
  console.log("A code change after this needs ./scripts/recheck_guides.ts again; reformatting does not.");
}

main();
