import { parseArgs } from "node:util";

import { loadConfig } from "@app/shared/config";
import { serve } from "@hono/node-server";

import { loadEnv } from "./lib/env.js";

const { values } = parseArgs({
  options: { env: { type: "string", short: "e" } },
  strict: true,
});

loadEnv(values.env);

const { app } = await import("../src/index.js");
const { backend } = loadConfig();

serve({ fetch: app.fetch, port: backend.devPort });
console.log(`Backend running on http://localhost:${backend.devPort}`);
