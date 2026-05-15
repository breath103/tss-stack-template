#!/usr/bin/env -S node --import tsx
import { type Command } from "./e2e/command.js";
import { start, stop } from "./e2e/commands/lifecycle.js";
import { navigate, screenshot, runJs, click, type, wait, setViewport, pageText } from "./e2e/commands/browser.js";
import { run } from "./e2e/commands/run.js";

// --- Commands ---

const commands: Record<string, Command> = {
  run,
  start,
  stop,
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
    const lines = Object.entries(commands).map(([name, cmd]) =>
      `  ${(name + cmd.usage).padEnd(30)} ${cmd.description}`
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
