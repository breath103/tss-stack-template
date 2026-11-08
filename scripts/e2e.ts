#!/usr/bin/env -S node --import tsx
import { type Command } from "./e2e/command.js";
import { click, navigate, pageText, runJs, screenshot, setViewport, type, wait } from "./e2e/commands/browser.js";
import { reset, start, stop } from "./e2e/commands/lifecycle.js";
import { run } from "./e2e/commands/run.js";

// --- Commands ---

// `Partial`: the lookup below is a user-supplied string, so a miss is the normal path a
// non-partial Record would type away.
const commands: Partial<Record<string, Command>> = {
  run,
  start,
  stop,
  reset,
  navigate,
  screenshot,
  "run-js": runJs,
  click,
  type,
  wait,
  "set-viewport": setViewport,
  "page-text": pageText,
};

// --- Main ---

async function main() {
  const [commandName, ...rest] = process.argv.slice(2);

  if (!commandName || commandName === "help") {
    const lines = Object.entries(commands).flatMap(([name, cmd]) =>
      cmd ? [`  ${(name + cmd.usage).padEnd(30)} ${cmd.description}`] : []
    );
    console.log(`\nUsage: ./scripts/e2e.ts <command> [args]\n\nCommands:\n${lines.join("\n")}\n`);
    return;
  }

  const command = commands[commandName];
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    process.exit(1);
  }

  await command.run(commandName, rest);
}

void main();
