import path from "path";
import { spawn } from "child_process";
import { config as dotenvConfig } from "dotenv";
import { loadAndValidateEnv } from "@app/shared/env-parser";

const ROOT = path.resolve(import.meta.dirname, "..");

// Load .env
dotenvConfig({ path: path.join(ROOT, ".env") });

// Parse and validate environment variables from env.d.ts
console.log("Validating environment variables...");
loadAndValidateEnv(path.join(ROOT, "src/env.d.ts"));
console.log("Environment variables OK\n");

// Start the dev server
const child = spawn("tsx", ["watch", "src/index.ts"], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
