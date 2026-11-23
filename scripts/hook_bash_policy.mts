#!/usr/bin/env node
// Claude Code PreToolUse hook for the Bash tool, registered in `.claude/settings.json`.
// Shebang is plain `node`, not `node --import tsx`: this runs before every Bash call and tsx
// triples the start-up time. Node strips the types itself, so keep the import graph free of
// anything that needs a transform or a dependency.
import { readFileSync } from "node:fs";

import { BashCommandPolicy } from "shared/bash-command-policy";

function main() {
  const { tool_input: toolInput } = JSON.parse(readFileSync(0, "utf8")) as { tool_input: { command: string } };
  const verdict = BashCommandPolicy.verdict(toolInput.command);
  if (verdict === null) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: verdict.reason,
      },
    })
  );
}

// Fails open: only a verdict blocks. A crash here must not take the Bash tool down with it.
try {
  main();
} catch (error) {
  console.error("hook_bash_policy crashed, command allowed:", error);
}
