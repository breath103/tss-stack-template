import ts from "typescript";
import fs from "fs";
import path from "path";

export interface EnvVar {
  name: string;
  required: boolean;
}

export function parseEnvDts(envDtsPath: string): EnvVar[] {
  const content = fs.readFileSync(path.resolve(envDtsPath), "utf-8");
  const source = ts.createSourceFile("env.d.ts", content, ts.ScriptTarget.Latest, true);

  const nodeJS = source.statements
    .filter(ts.isModuleDeclaration)
    .find((n) => n.name.text === "NodeJS");
  if (!nodeJS?.body || !ts.isModuleBlock(nodeJS.body)) {
    throw new Error("Missing: declare namespace NodeJS");
  }

  const processEnv = nodeJS.body.statements
    .filter(ts.isInterfaceDeclaration)
    .find((n) => n.name.text === "ProcessEnv");
  if (!processEnv) {
    throw new Error("Missing: interface ProcessEnv");
  }

  return processEnv.members
    .filter(ts.isPropertySignature)
    .filter((m): m is ts.PropertySignature & { name: ts.Identifier } => ts.isIdentifier(m.name))
    .map((m) => {
      const name = m.name.text;
      const type = m.type?.getText(source);
      if (type === "string") return { name, required: true };
      if (type === "string | undefined") return { name, required: false };
      throw new Error(`${name}: must be "string" or "string | undefined", got "${type}"`);
    });
}

export function validateEnv(
  vars: EnvVar[],
  env: Record<string, string | undefined> = process.env
): { missing: string[]; provided: Record<string, string> } {
  const missing: string[] = [];
  const provided: Record<string, string> = {};

  for (const v of vars) {
    const value = env[v.name];
    if (value) {
      provided[v.name] = value;
    } else if (v.required) {
      missing.push(v.name);
    }
  }

  return { missing, provided };
}

export function loadAndValidateEnv(envDtsPath: string): Record<string, string> {
  const vars = parseEnvDts(envDtsPath);
  const { missing, provided } = validateEnv(vars);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars:\n  ${missing.join("\n  ")}`);
  }

  return provided;
}
