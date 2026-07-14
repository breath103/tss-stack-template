process.title = "dev:backend:server";

import path from "node:path";
import { serve } from "@hono/node-server";
import { loadConfig } from "shared/config";
import { loadAndValidateEnv } from "shared/env-parser";

// Validate env vars (already loaded by with-env.sh)
loadAndValidateEnv(path.join(import.meta.dirname, "../src/env.d.ts"));

const { project, backend, dev } = loadConfig();

// Namespace auth cookies per project+worktree so multiple localhost dev instances don't clobber each other.
process.env.BETTER_AUTH_COOKIE_PREFIX = `${project}-${dev.worktree}`;

const { app } = await import("../src/index.js");

// `serve` binds asynchronously — only log readiness from the listening
// callback so the orchestrator's readiness signal can't fire on a port that
// never bound. Surface a bind failure (e.g. EADDRINUSE) fast and loud instead
// of letting it race the premature "running on" line.
const server = serve({ fetch: app.fetch, port: backend.devPort }, () => {
  console.log(`Backend running on http://localhost:${backend.devPort}`);
});
server.on("error", (err: NodeJS.ErrnoException) => {
  const reason = err.code === "EADDRINUSE" ? `port ${backend.devPort} already in use` : err.message;
  console.error(`Backend failed to start: ${reason}`);
  process.exit(1);
});
