import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { config as dotenvConfig } from "dotenv";
import { parseEnvDts, validateEnv } from "@app/shared/env-parser";

// Load .env
dotenvConfig({ path: path.resolve(import.meta.dirname, ".env") });

// Parse env.d.ts and validate
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
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
