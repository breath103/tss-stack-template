#!/usr/bin/env -S node --import tsx
// The whole CI suite in one command: one pass/FAIL line per step, output of failed steps only.
//
//   ./scripts/ci_local.ts                  # typecheck + lint + test
//   ./scripts/ci_local.ts --only test      # one job: typecheck | lint | test
//
// Every run also has the local-only `guides` step (GUIDES_STEP).
import { spawn } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

// The `typecheck` and `test` jobs of `.github/workflows/deploy.yml` run this script with
// `--only`, so their steps live here and nowhere else. `lint` mirrors that workflow's sharded
// lint job (a step added there is added here in the same PR) and runs unsharded.
// `needsBackendTypes` is the leading `build-types.ts` step.
const JOBS = {
  typecheck: {
    needsBackendTypes: true,
    steps: [
      ["./packages/frontend/scripts/build-types.ts"],
      ["./scripts/build_types.ts"],
      ["./scripts/e2e_build_types.ts"],
      ["npm", "run", "-w", "@modules/ui", "typecheck"],
    ],
  },
  lint: {
    needsBackendTypes: true,
    steps: [["./scripts/lint.ts"], ["./scripts/knip.ts"]],
  },
  test: {
    needsBackendTypes: false,
    steps: [
      ["npm", "test", "-w", "backend"],
      ["npm", "test", "-w", "shared"],
    ],
  },
} satisfies Record<string, { needsBackendTypes: boolean; steps: string[][] }>;

// Local only, absent from deploy.yml, and run whatever `--only` says: fails for an agent whose
// source diff has had no `./scripts/recheck_guides.ts`. Passes at once for a person.
const GUIDES_STEP = ["./scripts/recheck_guides.ts", "--check"];

const JOB_NAMES = Object.keys(JOBS) as (keyof typeof JOBS)[];

interface StepResult {
  label: string;
  ok: boolean;
  output: string;
}

function runStep(job: string, command: string[]): Promise<StepResult> {
  const label = `${job.padEnd(9)} ${command.join(" ")}`;
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const [bin, ...args] = command;
    const child = spawn(bin, args, {
      cwd: path.resolve(import.meta.dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", chunk => (output += String(chunk)));
    child.stderr.on("data", chunk => (output += String(chunk)));
    child.on("error", reject);
    child.on("close", code => {
      const ok = code === 0;
      console.log(`${ok ? "pass" : "FAIL"}  ${label}  ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
      resolve({ label, ok, output });
    });
  });
}

function report(results: StepResult[], startedAt: number): never {
  const failed = results.filter(result => !result.ok);
  for (const { label, output } of failed) console.log(`\n── FAIL ${label}\n${output.trim()}`);
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n${failed.length === 0 ? "ci green" : `ci FAILED (${failed.length} step(s))`} in ${seconds}s`);
  process.exit(failed.length === 0 ? 0 : 1);
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { only: { type: "string" } } });
  const names = JOB_NAMES.filter(name => values.only === undefined || name === values.only);
  if (names.length === 0) {
    console.error(`Unknown job "${values.only}". Usage: ./scripts/ci_local.ts [--only ${JOB_NAMES.join("|")}]`);
    process.exit(2);
  }
  const startedAt = Date.now();

  // The frontend typecheck and type-aware oxlint read the declarations this emits, so
  // nothing may start before it finishes, and nothing is worth running if it failed.
  if (names.some(name => JOBS[name].needsBackendTypes)) {
    const prerequisite = await runStep("types", ["./packages/backend/scripts/build-types.ts"]);
    if (!prerequisite.ok) report([prerequisite], startedAt);
  }

  const results = await Promise.all([
    runStep("guides", GUIDES_STEP),
    ...names.flatMap(name => JOBS[name].steps.map(command => runStep(name, command))),
  ]);
  report(results, startedAt);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
