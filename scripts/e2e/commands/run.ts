import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Page } from "playwright";
import { z } from "zod";

import { type Scenario, type ScenarioPage } from "../../../e2e/_helpers.js";
import { Command } from "../command.js";
import { edgeUrl } from "../constants.js";
import * as status from "../status.js";
import { start as startChrome } from "./lifecycle.js";

const E2E_DIR = path.join(process.cwd(), "e2e");

// Terminal output budget. A failing run's untrimmed error + every browser
// console line still land in `e2e/fixtures/<name>/failure.log` — only the
// terminal (i.e. an agent's context window) is trimmed.
const MAX_ERROR_LINES = 20;
const MAX_LINE_CHARS = 200;
const MAX_BROWSER_LINES = 10;

function clip(line: string): string {
  return line.length > MAX_LINE_CHARS
    ? `${line.slice(0, MAX_LINE_CHARS)}… (+${line.length - MAX_LINE_CHARS} chars)`
    : line;
}

// Message capped to MAX_ERROR_LINES, stack reduced to frames inside the
// scenario files (`e2e/…`) — runner / node_modules frames never matter.
function compactError(err: unknown, logPath: string): string {
  if (!(err instanceof Error)) return clip(String(err));
  const lines = err.message.split("\n");
  const shown = lines.slice(0, MAX_ERROR_LINES).map(clip);
  if (lines.length > MAX_ERROR_LINES) shown.push(`… ${lines.length - MAX_ERROR_LINES} more lines in ${logPath}`);
  const frames = (err.stack ?? "")
    .split("\n")
    .filter(l => l.trimStart().startsWith("at ") && l.includes(`${E2E_DIR}/`))
    .map(l => l.replaceAll(`${process.cwd()}/`, ""));
  return [`${err.name}: ${shown.join("\n")}`, ...frames].join("\n");
}

// Wrap a Playwright `Page` so the only legal `screenshot` form is
// `{ name }`, routed to `e2e/fixtures/<scenarioName>/<name>.png`.
// Every other method/property forwards to the real page unchanged.
// Methods are bound to the original `Page` so `this`-dependent
// internals (waiters, locator caches, …) behave normally.
function wrapPage(page: Page, fixturesDir: string): ScenarioPage {
  return new Proxy(page, {
    get(target, prop) {
      if (prop === "screenshot") {
        return (opts: { name: string } & Record<string, unknown>) =>
          target.screenshot({ ...opts, path: path.join(fixturesDir, `${opts.name}.png`) });
      }
      const value = Reflect.get(target, prop) as unknown;
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  }) as unknown as ScenarioPage;
}

function listTests(): string[] {
  if (!fs.existsSync(E2E_DIR)) return [];
  return fs
    .readdirSync(E2E_DIR)
    .filter(f => f.endsWith(".ts") && !f.startsWith("_"))
    .map(f => f.replace(/\.ts$/, ""))
    .sort();
}

function printAvailable() {
  const tests = listTests();
  if (tests.length === 0) {
    console.log(`(no tests in ./e2e/ — add e2e/<name>.ts that default-exports a Scenario)`);
    return;
  }
  console.log("available tests:");
  for (const t of tests) console.log(`  ${t}`);
}

export const run = new Command(
  "Run an e2e test from ./e2e/<name>.ts (no name = list)",
  z.tuple([z.string().describe("name").optional()]),
  async name => {
    if (!name) {
      printAvailable();
      console.log("\nrun: npm run e2e <name>");
      return;
    }

    const file = path.join(E2E_DIR, `${name}.ts`);
    if (!fs.existsSync(file)) {
      console.error(`No e2e test at e2e/${name}.ts`);
      printAvailable();
      process.exit(1);
    }

    if (!status.read()) await startChrome.run("start", []);
    const e2e = status.requireRunning();

    // Wipe + recreate the scenario's fixtures dir so a passing run's
    // screenshots are always the latest. A crashed mid-run leaves whatever
    // was captured up to that point — the whole reason this dir exists.
    const fixturesDir = path.join(E2E_DIR, "fixtures", name);
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    fs.mkdirSync(fixturesDir, { recursive: true });

    const browser = await chromium.connectOverCDP(e2e.cdpEndpoint);
    const context = await browser.newContext({ baseURL: edgeUrl });
    const rawPage = await context.newPage();
    // Every browser line goes to `failure.log`; only errors/warnings reach the
    // terminal, capped — vite / React DevTools chatter never does.
    const browserLog: string[] = [];
    let echoed = 0;
    const onBrowserLine = (type: string, text: string) => {
      browserLog.push(`[browser:${type}] ${text}`);
      if (type !== "error" && type !== "warning") return;
      echoed++;
      if (echoed <= MAX_BROWSER_LINES) console.log(clip(`    [browser:${type}] ${text.split("\n")[0]}`));
      else if (echoed === MAX_BROWSER_LINES + 1) console.log(`    [browser] further output only in failure.log`);
    };
    rawPage.on("console", msg => onBrowserLine(msg.type(), msg.text()));
    rawPage.on("pageerror", err => onBrowserLine("error", err.message));

    const page = wrapPage(rawPage, fixturesDir);

    const t0 = Date.now();
    console.log(`> ${name}`);
    try {
      const mod: unknown = await import(pathToFileURL(file).href);
      const fn = typeof mod === "object" && mod !== null && "default" in mod ? mod.default : undefined;
      if (typeof fn !== "function") {
        throw new Error(`e2e/${name}.ts must default-export a Scenario`);
      }
      await (fn as Scenario)({ page, request: context.request });
      console.log(`PASS  ${name}  (${Date.now() - t0}ms)`);
    } catch (err) {
      const logPath = path.relative(process.cwd(), path.join(fixturesDir, "failure.log"));
      fs.writeFileSync(
        logPath,
        [
          err instanceof Error ? (err.stack ?? err.message) : String(err),
          "",
          "── browser console ──",
          ...browserLog,
        ].join("\n")
      );
      console.error(`FAIL  ${name}  (${Date.now() - t0}ms)`);
      console.error(compactError(err, logPath));
      console.error(`full error + browser console: ${logPath}`);
      process.exitCode = 1;
    } finally {
      await context.close();
      await browser.close();
    }
    // Force-exit so any dangling timers / WebSockets / network clients in
    // the scenario can't keep the process alive past the harness summary.
    // Per-scenario timeouts are enforced inside `harness()` in _helpers.ts.
    process.exit(process.exitCode ?? 0);
  }
);
