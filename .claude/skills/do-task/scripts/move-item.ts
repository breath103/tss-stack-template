import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { loadConfig, resolveColumnId } from "./lib.ts";

export function moveItem(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      item: { type: "string" },
      column: { type: "string" },
    },
    strict: true,
  });

  if (!values.item || !values.column) {
    console.error("Usage: move-item --item <item-id> --column <status>");
    process.exit(1);
  }

  const config = loadConfig();
  const optionId = resolveColumnId(config, values.column);

  execFileSync("gh", [
    "project", "item-edit",
    "--id", values.item,
    "--project-id", config.projectId,
    "--field-id", config.statusFieldId,
    "--single-select-option-id", optionId,
  ], { encoding: "utf-8" });

  console.log(JSON.stringify({ id: values.item, status: values.column }));
}
