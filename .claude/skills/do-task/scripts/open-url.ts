import { execFileSync, spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

// Orca CLI (`orca tab create`) opens the URL as a browser tab inside the Orca
// session — the user's ADE — instead of launching the system browser, then
// `orca tab switch --focus` brings it to the front: a tab opened in the background
// is one the user never sees. Falls back to `open` when the `orca` binary is
// missing or the tab creation fails (no Orca app running, CLI not registered
// under Settings → General → Orca CLI).
export function openUrl(args: string[]): void {
  const { values, positionals } = parseArgs({
    args,
    options: { chrome: { type: "boolean" } },
    allowPositionals: true,
    strict: true,
  });
  const url = positionals[0];
  if (!url) {
    console.error("Usage: open-url <url> [--chrome]");
    process.exit(1);
  }

  if (!values.chrome && openInOrca(url)) {
    console.log(`Opened in Orca: ${url}`);
    return;
  }
  execFileSync("open", [url], { stdio: "inherit" });
  console.log(`Opened in system browser: ${url}`);
}

function openInOrca(url: string): boolean {
  const created = spawnSync("orca", ["tab", "create", "--url", url, "--worktree", "active", "--json"], {
    encoding: "utf-8",
  });
  if (created.status !== 0) return false;
  const pageId = parsePageId(created.stdout);
  if (!pageId) return true;
  spawnSync("orca", ["tab", "switch", "--page", pageId, "--worktree", "active", "--focus", "--json"], {
    encoding: "utf-8",
  });
  return true;
}

function parsePageId(stdout: string): string | undefined {
  try {
    const pageId = (JSON.parse(stdout) as { result?: { browserPageId?: unknown } }).result?.browserPageId;
    return typeof pageId === "string" ? pageId : undefined;
  } catch {
    return undefined;
  }
}
