#!/usr/bin/env -S node --import tsx
process.title = "dev:backend:watcher";

import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { watch, type WatchOptions } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { merge, Observable } from "rxjs";
import { debounceTime, startWith } from "rxjs/operators";
import { resolveBin } from "shared/cli-utils";

import { loadEnv } from "./lib/env.js";

const ROOT = path.join(import.meta.dirname, "..");
const srcPath = path.join(ROOT, "src");

const watch$ = (p: string, opts?: WatchOptions) =>
  new Observable<void>((sub) => {
    watch(p, opts, () => sub.next());
  });

let server: ChildProcess | null = null;
// Set right before we SIGTERM the server for a file-change restart, so its
// `exit` is recognized as intentional and not treated as a crash.
let restarting = false;

const startServer = (tsx: string) => {
  restarting = false;
  server = spawn(tsx, ["scripts/server.ts"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  server.once("exit", (code) => {
    // Intentional restart (a file change SIGTERM'd it) → respawn. Otherwise the
    // server died on its own (e.g. failed to bind its port) — propagate the
    // failure instead of idling with a dead child, since the orchestrator
    // watches THIS process and only fails fast when it exits.
    if (restarting) startServer(tsx);
    else process.exit(code ?? 1);
  });
};

function main(): void {
  const tsx = resolveBin("tsx", ROOT);
  const { values } = parseArgs({
    options: { env: { type: "string", short: "e", default: "development" } },
    strict: false,
  });
  loadEnv(values.env);

  merge(watch$(srcPath, { recursive: true }))
    .pipe(debounceTime(100), startWith(null))
    .subscribe(() => {
      if (server) {
        restarting = true;
        server.kill("SIGTERM");
      } else {
        startServer(tsx);
      }
    });
}

main();
