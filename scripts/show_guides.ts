#!/usr/bin/env -S node --import tsx
// Print the full text of the coding guides with these `./scripts/list_guides.ts` numbers.
//
//   ./scripts/show_guides.ts 1,2,5
//
// Bash tool output limit: a result over ~30KB reaches the agent as a 2KB preview, so one call
// prints what fits and names the command for the rest.
import { GuideRecheck } from "./lib/guide_recheck.js";
import { Guides } from "./lib/guides.js";

const OUTPUT_BUDGET = 24_000;

function main(): void {
  const numbers = process.argv
    .slice(2)
    .flatMap(arg => arg.split(","))
    .filter(part => part.trim() !== "")
    .map(Number);
  if (numbers.length === 0) {
    console.error("Usage: ./scripts/show_guides.ts <n>,<n>,…   (numbers from ./scripts/list_guides.ts)");
    process.exit(1);
  }
  try {
    const guides = Guides.forRepo();
    const recheck = GuideRecheck.forRepo();
    recheck.begin();
    const texts = guides.pick(numbers).map(guide => ({
      number: guide.number,
      slug: guide.slug,
      text: `# ${guide.number}. ${guide.title}\n\n${guide.body}\n`,
    }));
    let used = 0;
    const shown = texts.filter((guide, index) => {
      used += guide.text.length;
      return index === 0 || used <= OUTPUT_BUDGET;
    });
    // `| head` closes the pipe mid-print (EPIPE): record first, or a truncated run never counts.
    recheck.recordRequest(
      texts.map(guide => guide.slug),
      shown.map(guide => guide.slug)
    );
    process.stdout.on("error", () => process.exit(0));
    for (const guide of shown) console.log(guide.text);
    // Everything picked on this branch and not printed yet, not only this call's overflow: an
    // id dropped while retyping the list stays here until it is shown.
    const pending = recheck.pending();
    const rest = guides
      .all()
      .filter(guide => pending.includes(guide.slug))
      .map(guide => guide.number);
    if (rest.length > 0) {
      console.log(`PICKED BUT NOT SHOWN: ${rest.join(",")}. Run next: ./scripts/show_guides.ts ${rest.join(",")}`);
      return;
    }
    console.log("When the code is written, run next: ./scripts/recheck_guides.ts");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
