/// <reference types="vitest/config" />
import path from "node:path";

import { loadConfig } from "shared/config";
import { parseEnvDts, validateEnv } from "shared/env-parser";
import { defineConfig } from "vite";

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

function htmlEnvPlugin() {
  return {
    name: "html-env",
    transformIndexHtml(html: string) {
      for (const v of vars) {
        html = html.replaceAll(`\${${v.name}}`, provided[v.name] ?? "");
      }
      return html;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), htmlEnvPlugin()],
  define: envDefines,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: config.frontend.devPort,
    // Fail fast if the port is taken instead of silently picking the next free
    // one — the edge proxy is hardwired to this exact port, so a moved vite
    // serves nobody and looks "ready" on the wrong port.
    strictPort: true,
  },
  test: {
    include: ["src/**/__tests__/*.ts"],
  },
});
