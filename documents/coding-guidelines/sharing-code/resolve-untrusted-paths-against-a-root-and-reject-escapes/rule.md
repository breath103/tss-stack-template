---
topic: Untrusted input
order: 10
---

# When a caller supplies a file path, resolve it against a root and reject absolute paths, `..` and symlink escapes.

When code accepts a **caller-supplied path** and reads/writes it under a fixed root
directory — a sandbox, an upload dir, any per-tenant scratch space — the path is
untrusted input. Resolve it against the root and **reject anything that escapes**, in
one shared helper that every read/write funnels through. Never `path.join(root,
relPath)` and use the result directly.

Three distinct escape vectors, all of which must be rejected:

1. **Absolute input** — `path.isAbsolute(relPath)` → reject. `path.resolve(root, "/etc/x")`
   silently discards the root and returns `/etc/x`.
2. **`../` traversal** — after `const abs = path.resolve(root, relPath)`, require
   `abs === root || abs.startsWith(root + path.sep)`.
3. **Symlink escape** — a lexically-inside path can still point outside via a symlink.
   `realpath` the deepest **existing** ancestor (the target file may not exist yet) and
   require it to stay inside `realpath(root)`.

```ts
// ✅ one gate, all three checks; every read/write goes through it
private async resolveInside(relPath: string): Promise<string> {
  if (path.isAbsolute(relPath)) throw new Error(`absolute path rejected: ${relPath}`);
  const abs = path.resolve(this.root, relPath);
  if (abs !== this.root && !abs.startsWith(this.root + path.sep)) {
    throw new Error(`path escapes: ${relPath}`);
  }
  const realRoot = await fs.realpath(this.root);
  const realAncestor = await realpathOfNearestExisting(abs); // deepest existing ancestor
  if (realAncestor !== realRoot && !realAncestor.startsWith(realRoot + path.sep)) {
    throw new Error(`path escapes via symlink: ${relPath}`);
  }
  return abs;
}
```

```ts
// ❌ traversal + absolute + symlink all slip straight through
async readFile(relPath: string) {
  return fs.readFile(path.join(this.root, relPath), "utf8");
}
```

The lexical `startsWith(root + path.sep)` guard must include the separator: without it
`/root-sibling` matches `/root` as a prefix. This path-scope is the isolation boundary
wherever a stronger one (a VM/container) isn't present.
