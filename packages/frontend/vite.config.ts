import path from "node:path";

import { defineConfig } from "vite";

import { loadConfig } from "shared/config";
import { parseEnvDts, validateEnv } from "shared/env-parser";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

const config = loadConfig();

// Parse env.d.ts and validate against process.env (loaded by scripts/dev.ts or deploy.ts)
const vars = parseEnvDts(path.resolve(import.meta.dirname, "src/env.d.ts"));
const { missing, provided } = validateEnv(vars);

if (missing.length > 0) {
  throw new Error(`Missing required env vars:\n  ${missing.join("\n  ")}`);
}

// Create define entries for process.env.*
const envDefines = Object.fromEntries(
  vars.map((v) => [`process.env.${v.name}`, JSON.stringify(provided[v.name] ?? "")])
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: envDefines,
  server: {
    port: config.frontend.devPort,
  },
});
