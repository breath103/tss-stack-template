process.title = "dev:backend:server";

import path from "node:path";

import { loadConfig } from "shared/config";
import { loadAndValidateEnv } from "shared/env-parser";

import { serve } from "@hono/node-server";

// Validate env vars (already loaded by with-env.sh)
loadAndValidateEnv(path.join(import.meta.dirname, "../src/env.d.ts"));

const { project, backend, dev } = loadConfig();

// Namespace auth cookies per project+worktree so multiple localhost dev instances don't clobber each other.
process.env.BETTER_AUTH_COOKIE_PREFIX = `${project}-${dev.worktree}`;

const { app } = await import("../src/index.js");

serve({ fetch: app.fetch, port: backend.devPort });
console.log(`Backend running on http://localhost:${backend.devPort}`);
