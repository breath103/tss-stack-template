import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { merge, Observable } from "rxjs";
import { debounceTime, startWith } from "rxjs/operators";

const env = parseCliArgs();
const envPath = path.join(import.meta.dirname, "..", env ? `.env.${env}` : ".env");
const srcPath = path.join(import.meta.dirname, "..", "src");

const watch$ = (p: string, opts?: { recursive?: boolean }) =>
  new Observable<void>((sub) => {
    watch(p, opts, () => sub.next());
  });

let server: ChildProcess | null = null;

const startServer = () => {
  server = spawn("tsx", ["scripts/server.ts", ...(env ? ["--env", env] : [])], {
    cwd: path.join(import.meta.dirname, ".."),
    stdio: "inherit",
  });
};

merge(watch$(envPath), watch$(srcPath, { recursive: true }))
  .pipe(debounceTime(100), startWith(null))
  .subscribe(() => {
    if (server) {
      server.once("exit", startServer);
      server.kill("SIGTERM");
    } else {
      startServer();
    }
  });

function parseCliArgs() {
  const { values } = parseArgs({
    options: { env: { type: "string", short: "e" } },
    strict: true,
  });
  return values.env;
}
