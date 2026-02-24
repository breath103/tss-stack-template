import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

function main() {
  // Clean dist
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Transpile TypeScript to JavaScript
  console.log("Transpiling TypeScript...");
  execSync("npx tsc --outDir dist", { cwd: ROOT, stdio: "inherit" });

  // Copy package.json with only production dependencies
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")) as {
    name: string;
    version: string;
    type: string;
    dependencies: Record<string, string>;
  };
  fs.writeFileSync(path.join(DIST, "package.json"), JSON.stringify({
    name: pkg.name,
    version: pkg.version,
    type: pkg.type,
    dependencies: pkg.dependencies,
  }, null, 2));

  console.log("Pack build complete");
}

main();
