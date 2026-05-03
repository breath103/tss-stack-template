import { spawn } from "node:child_process";
import path from "node:path";

import { chromium } from "playwright";
import { z } from "zod";

import { Command } from "../command.js";
import { TMP_DIR } from "../constants.js";
import * as status from "../status.js";

async function waitForCdp(port: number, timeoutMs = 10_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json() as { webSocketDebuggerUrl: string };
      return data.webSocketDebuggerUrl;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Timed out waiting for CDP on port ${port}`);
}

export const start = new Command("Start headless Chrome (stores CDP endpoint)", z.tuple([]), async () => {
  const existing = status.read();
  if (existing) {
    try {
      process.kill(existing.pid, 0);
      console.log(`already running | pid:${existing.pid} | ${existing.cdpEndpoint}`);
      return;
    } catch {
      status.remove();
    }
  }

  const chrome = spawn(chromium.executablePath(), [
    "--headless=new",
    `--remote-debugging-port=${status.CDP_PORT}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--window-size=1280,800",
    `--user-data-dir=${path.join(TMP_DIR, `e2e-chrome-profile-${status.NAMESPACE}`)}`,
  ], { stdio: "ignore", detached: true });
  chrome.unref();

  if (!chrome.pid) {
    console.error("Failed to start Chrome");
    process.exit(1);
  }

  const endpoint = await waitForCdp(status.CDP_PORT);
  status.write({ cdpEndpoint: endpoint, pid: chrome.pid });
  console.log(`started | pid:${chrome.pid} | ${endpoint}`);
});

export const stop = new Command("Stop headless Chrome", z.tuple([]), async () => {
  const s = status.read();
  if (!s) {
    console.log("not running");
    return;
  }
  try { process.kill(s.pid, "SIGTERM"); } catch { /* already dead */ }
  status.remove();
  console.log("stopped");
});
