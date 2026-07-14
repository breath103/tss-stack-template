import fs from "fs";
import path from "path";

export interface EnvVar {
  name: string;
  required: boolean;
  /**
   * True if the property has a `@cdk-injected` JSDoc tag.
   *
   * Such vars are guaranteed to exist in the Lambda runtime (either because
   * the AWS runtime sets them — like AWS_REGION — or because the CDK stack
   * sets them on `lambda.Function.environment` explicitly). They are NOT
   * expected to be present in the deploy shell, and must NOT be forwarded into
   * the Lambda env via the deploy script's env spread, or CDK rejects reserved
   * names like AWS_REGION.
   */
  cdkInjected: boolean;
}

// A member is @cdk-injected when a `//` or `/* */` comment carrying the tag
// sits immediately before it. Detected against the raw source before comments
// are stripped, keyed by the member name that follows the comment.
function cdkInjectedNames(content: string): Set<string> {
  const names = new Set<string>();
  const patterns = [
    /\/\*[\s\S]*?@cdk-injected[\s\S]*?\*\/\s*([A-Za-z_$][\w$]*)/g,
    /\/\/[^\n]*@cdk-injected[^\n]*\n\s*([A-Za-z_$][\w$]*)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) names.add(m[1]);
  }
  return names;
}

// env.d.ts is a tightly controlled shape (see backend.md "Declare env vars in
// env.d.ts"): a single `declare namespace NodeJS { interface ProcessEnv { ... } }`
// whose members are `NAME: string` (required) or `NAME: string | undefined`
// (optional). We parse it by hand rather than with the TypeScript compiler API
// so `shared` carries no dependency on the `typescript` package — TypeScript 7's
// native compiler no longer ships that JS API.
export function parseEnvDts(envDtsPath: string): EnvVar[] {
  const content = fs.readFileSync(path.resolve(envDtsPath), "utf-8");
  const cdkInjected = cdkInjectedNames(content);

  // Drop comments so `/// <reference ... />`, `//` and `/* */` lines can't be
  // mistaken for members.
  const source = content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  if (!/declare\s+namespace\s+NodeJS\s*\{/.test(source)) {
    throw new Error("Missing: declare namespace NodeJS");
  }

  // ProcessEnv members are flat property signatures with no nested braces, so
  // the first `}` after the interface opener closes its body.
  const body = source.match(/interface\s+ProcessEnv\s*\{([^}]*)\}/)?.[1];
  if (body === undefined) {
    throw new Error("Missing: interface ProcessEnv");
  }

  return body
    .split(";")
    .map((member) => member.trim())
    .filter((member) => member.length > 0)
    .map((member) => {
      // Allow an optional `?` on the name; classify purely by the declared type.
      const match = member.match(/^([A-Za-z_$][\w$]*)\??\s*:\s*(.+)$/s);
      if (!match) {
        throw new Error(`Cannot parse ProcessEnv member: "${member}"`);
      }
      const name = match[1];
      const type = match[2].replace(/\s+/g, " ").trim();
      const injected = cdkInjected.has(name);
      if (type === "string") return { name, required: !injected, cdkInjected: injected };
      if (type === "string | undefined") return { name, required: false, cdkInjected: injected };
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
    // CDK-injected vars are not expected in the deploy shell and must not be
    // forwarded into Lambda env (Lambda reserves some names, e.g. AWS_REGION).
    if (v.cdkInjected) continue;

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
