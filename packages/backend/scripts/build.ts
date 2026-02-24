import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function main() {
  execSync("npm run pack:build", { cwd: ROOT, stdio: "inherit" });
  execSync("npm run pack:install", { cwd: ROOT, stdio: "inherit" });
  console.log("Build complete");
}

main();
