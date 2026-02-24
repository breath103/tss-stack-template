import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

function main() {
  console.log("Installing dependencies for linux-x64...");
  execSync("npm install --os=linux --cpu=x64 --omit=dev --force", {
    cwd: DIST,
    stdio: "inherit",
  });
  console.log("Pack install complete");
}

main();
