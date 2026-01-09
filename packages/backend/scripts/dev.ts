import path from "path";
import { config as dotenvConfig } from "dotenv";
import { loadAndValidateEnv } from "@app/shared/env-parser";
import { loadConfig } from "@app/shared/config";
import { serve } from "@hono/node-server";
import { app } from "../src/index.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const config = loadConfig();

// Load .env
dotenvConfig({ path: path.join(ROOT, ".env") });

// Parse and validate environment variables from env.d.ts
console.log("Validating environment variables...");
loadAndValidateEnv(path.join(ROOT, "src/env.d.ts"));
console.log("Environment variables OK\n");

// Start the dev server
const port = config.backend.devPort;
console.log(`Backend running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
