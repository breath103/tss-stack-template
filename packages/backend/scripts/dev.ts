import path from "path";
import { config as dotenvConfig } from "dotenv";
import { loadAndValidateEnv } from "@app/shared/env-parser";
import { loadConfig } from "@app/shared/config";
import { serve } from "@hono/node-server";

const ROOT = path.resolve(import.meta.dirname, "..");
const config = loadConfig();

// Load .env BEFORE importing app (which uses process.env)
dotenvConfig({ path: path.join(ROOT, ".env") });

// Parse and validate environment variables from env.d.ts
console.log("Validating environment variables...");
loadAndValidateEnv(path.join(ROOT, "src/env.d.ts"));
console.log("Environment variables OK\n");

// Dynamic import AFTER env is loaded
const { app } = await import("../src/index.js");

// Start the dev server
const port = config.backend.devPort;
console.log(`Backend running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
