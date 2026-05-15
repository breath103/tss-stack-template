import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";
import { z } from "zod";

import { Command } from "../command.js";
import { edgeUrl } from "../constants.js";
import * as status from "../status.js";
import { start as startChrome } from "./lifecycle.js";

const E2E_DIR = path.join(process.cwd(), "e2e");

function listTests(): string[] {
  if (!fs.existsSync(E2E_DIR)) return [];
  return fs.readdirSync(E2E_DIR)
    .filter((f) => f.endsWith(".ts") && !f.startsWith("_"))
    .map((f) => f.replace(/\.ts$/, ""))
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

export const run = new Command("Run an e2e test from ./e2e/<name>.ts (no name = list)",
  z.tuple([z.string().describe("name").optional()]),
  async (name) => {
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

    const browser = await chromium.connectOverCDP(e2e.cdpEndpoint);
    const context = await browser.newContext({ baseURL: edgeUrl });
    const page = await context.newPage();
    page.on("console", (msg) => console.log(`    [browser:${msg.type()}] ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`    [browser:error] ${err.message}`));

    const t0 = Date.now();
    console.log(`> ${name}`);
    try {
      const mod = await import(pathToFileURL(file).href);
      const fn = mod.default;
      if (typeof fn !== "function") {
        throw new Error(`e2e/${name}.ts must default-export a Scenario`);
      }
      await fn({ page, request: context.request });
      console.log(`PASS  ${name}  (${Date.now() - t0}ms)`);
    } catch (err) {
      console.error(`FAIL  ${name}  (${Date.now() - t0}ms)`);
      console.error(err instanceof Error ? err.stack ?? err.message : err);
      process.exitCode = 1;
    } finally {
      await context.close();
      await browser.close();
    }
  },
);
