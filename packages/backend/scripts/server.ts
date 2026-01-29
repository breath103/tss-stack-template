import path from "node:path";

import { loadConfig } from "shared/config";
import { loadAndValidateEnv } from "shared/env-parser";

import { serve } from "@hono/node-server";

// Validate env vars (already loaded by with-env.sh)
loadAndValidateEnv(path.join(import.meta.dirname, "../src/env.d.ts"));

const { app } = await import("../src/index.js");
const { backend } = loadConfig();

serve({ fetch: app.fetch, port: backend.devPort });
console.log(`Backend running on http://localhost:${backend.devPort}`);
