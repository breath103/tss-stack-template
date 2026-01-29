import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";

import { merge, Observable } from "rxjs";
import { debounceTime, startWith } from "rxjs/operators";

const ROOT = path.join(import.meta.dirname, "..");
const srcPath = path.join(ROOT, "src");

const watch$ = (p: string, opts?: { recursive?: boolean }) =>
  new Observable<void>((sub) => {
    watch(p, opts, () => sub.next());
  });

let server: ChildProcess | null = null;

const startServer = () => {
  server = spawn("tsx", ["scripts/server.ts"], {
    cwd: ROOT,
    stdio: "inherit",
  });
};

merge(watch$(srcPath, { recursive: true }))
  .pipe(debounceTime(100), startWith(null))
  .subscribe(() => {
    if (server) {
      server.once("exit", startServer);
      server.kill("SIGTERM");
    } else {
      startServer();
    }
  });
