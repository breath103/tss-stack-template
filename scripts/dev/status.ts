#!/usr/bin/env -S node --import tsx
import { parseArgs } from "node:util";

import { type ProcessRow, ProcessTable } from "./process-table.js";

interface Node extends ProcessRow {
  cwd: string | null;
  children: Node[];
}

function buildTree(table: ProcessTable, row: ProcessRow): Node {
  return { ...row, cwd: null, children: table.childrenOf(row.pid).map(child => buildTree(table, child)) };
}

function collectPids(node: Node): number[] {
  return [node.pid, ...node.children.flatMap(collectPids)];
}

function applyCwds(node: Node, cwds: Map<number, string>): void {
  node.cwd = cwds.get(node.pid) ?? null;
  for (const child of node.children) applyCwds(child, cwds);
}

function printNode(node: Node, prefix: string, childrenPrefix: string): void {
  const cwdLabel = node.cwd === null ? "" : ` \x1b[33mcwd=${node.cwd}\x1b[0m`;
  console.log(`${prefix}\x1b[2mpid=${node.pid}\x1b[0m ${node.command}${cwdLabel}`);
  node.children.forEach((child, i) => {
    const isLast = i === node.children.length - 1;
    printNode(child, childrenPrefix + (isLast ? "└── " : "├── "), childrenPrefix + (isLast ? "    " : "│   "));
  });
}

function countAll(node: Node): number {
  return 1 + node.children.reduce((sum, child) => sum + countAll(child), 0);
}

function main(): void {
  const { positionals } = parseArgs({ allowPositionals: true });
  const rootPid = Number(positionals[0]);
  if (!rootPid) {
    console.error("Usage: ./scripts/dev/status.ts <pid>");
    process.exit(1);
  }

  const table = ProcessTable.load();
  const rootRow = table.rows.find(row => row.pid === rootPid);
  if (!rootRow) {
    console.error(`Process ${rootPid} not found.`);
    process.exit(1);
  }

  const root = buildTree(table, rootRow);
  applyCwds(root, ProcessTable.cwds(collectPids(root)));

  console.log();
  printNode(root, "", "");
  console.log(`\n\x1b[2mTotal: ${countAll(root)} processes\x1b[0m`);
}

main();
