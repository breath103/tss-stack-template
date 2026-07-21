import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, parse as parsePath } from "node:path";

// Backend runtime code (src/, excluding tests) is bundled into the Lambda with
// ONLY package.json `dependencies`. An import of a package that's a
// devDependency or undeclared resolves against the hoisted root node_modules,
// so it type-checks — but it is NOT installed into dist/, and the deployed
// Lambda crashes at runtime the first time that module is required. This rule
// fails the lint instead. The oxlint config scopes it to backend `src/` (off
// for `__tests__`). Type-only imports (`import type …`) are elided at build and
// never ship, so they're allowed.

// oxlint's JS-plugin author types aren't exported from `oxlint/plugins-dev`, so
// we model the minimal surface this rule touches.
interface SourceNode {
  type: string;
  range: [number, number];
  value: string;
}
interface ModuleNode {
  importKind?: "value" | "type";
  exportKind?: "value" | "type";
  source?: SourceNode | null;
}
interface Context {
  filename: string;
  report: (diagnostic: { node: SourceNode; messageId: string; data?: Record<string, string> }) => void;
}

const builtins = new Set(builtinModules);

// The npm package a bare import specifier belongs to, or null for anything that
// doesn't need to be a declared dependency (relative paths, node: builtins).
function packageOf(specifier: string): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("/")) return null;
  const bare = specifier.startsWith("node:") ? specifier.slice("node:".length) : specifier;
  const head = bare.split("/")[0];
  if (builtins.has(bare) || builtins.has(head)) return null;
  return bare.startsWith("@") ? bare.split("/").slice(0, 2).join("/") : head;
}

// Walk up from the linted file to the nearest package.json and read its
// `dependencies` keys. Cached per resolved manifest path.
const cache = new Map<string, Set<string>>();
function declaredDependencies(fromFile: string): Set<string> {
  let dir = dirname(fromFile);
  const root = parsePath(dir).root;
  for (;;) {
    const manifestPath = join(dir, "package.json");
    const cached = cache.get(manifestPath);
    if (cached) return cached;
    try {
      const pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        dependencies?: Record<string, string>;
      };
      const deps = new Set(Object.keys(pkg.dependencies ?? {}));
      cache.set(manifestPath, deps);
      return deps;
    } catch {
      if (dir === root) return new Set();
      dir = dirname(dir);
    }
  }
}

function check(context: Context, node: ModuleNode): void {
  if (node.importKind === "type" || node.exportKind === "type") return;
  const source = node.source;
  if (!source) return;

  const pkg = packageOf(source.value);
  if (pkg === null) return;

  if (!declaredDependencies(context.filename).has(pkg)) {
    context.report({ node: source, messageId: "extraneous", data: { pkg } });
  }
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing a package that isn't a runtime dependency into bundled src/ — it type-checks but crashes the deployed Lambda",
    },
    messages: {
      extraneous:
        "`{{pkg}}` is not a runtime dependency — importing it into src/ type-checks but crashes the deployed Lambda (only package.json `dependencies` ship). Add it to `dependencies`, or make this a type-only import.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      ImportDeclaration: (node: ModuleNode) => check(context, node),
      ExportNamedDeclaration: (node: ModuleNode) => check(context, node),
      ExportAllDeclaration: (node: ModuleNode) => check(context, node),
    };
  },
};

export default rule;
