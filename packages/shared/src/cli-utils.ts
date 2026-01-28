import { createInterface } from "node:readline";

const DURATION_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3600_000, d: 86400_000 };

/**
 * Parse a duration string (e.g., "30s", "5m", "1h", "7d") into a timestamp.
 * Returns the timestamp for (now - duration).
 */
export function parseDuration(input: string): number {
  const match = input.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    console.error(`Error: invalid duration "${input}". Use format: <number><s|m|h|d>`);
    process.exit(1);
  }
  return Date.now() - parseInt(match[1], 10) * DURATION_MS[match[2]];
}

/**
 * Prompt the user for confirmation. Returns true if they answer "y" or "yes".
 */
export async function askConfirmation(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer));
    });
  });
}

/**
 * Sleep for the specified number of milliseconds.
 */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
