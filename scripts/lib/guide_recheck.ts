import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { formatInsensitiveChange } from "shared/format-insensitive-hash";

/** A source file that differs from the merge-base with `origin/main`, formatting aside. */
export interface FileChange {
  path: string;
  /** `null` = the file is not in the merge-base. */
  before: string | null;
  /** `null` = the file is deleted. */
  after: string | null;
  /** Tokens gained and lost against the merge-base. A reformat, a commit, or `main` merged in
   *  around the edit leaves it as it was. */
  signature: string;
  /** The tokens behind `signature`: gained (positive) and lost (negative). */
  tokens: Record<string, number>;
  /** Trimmed lines of `after` that `before` does not have. */
  added: string[];
}

interface BranchState {
  /** Guide slugs, not numbers: a number shifts when a guide is added or removed. */
  shown: string[];
  /** Asked for with `show_guides.ts` and not printed yet (the output budget cut them off). */
  picked: string[];
  /** Signatures of what was already changed when the agent started: not its changes. `null` in
   *  a state file written before baselines existed: everything against the merge-base counts. */
  baseline: Record<string, string> | null;
  recheck: {
    signatures: Record<string, string>;
    /** Each file's `tokens` then, to size what a later run added: line counts would not
     *  survive the formatter rewrapping the file in between. Absent in older state files. */
    tokens?: Record<string, Record<string, number>>;
    /** Short hash per added line, to pick the lines a later run prints. */
    lineHashes: Record<string, string[]>;
  } | null;
}

/** Which guides this branch was shown, what the session changed, and whether `recheck_guides.ts` saw it. */
export class GuideRecheck {
  private static readonly SOURCE_DIRS = ["packages", "modules", "scripts"];
  private static readonly EMPTY: BranchState = { shown: [], picked: [], baseline: null, recheck: null };

  static forRepo(): GuideRecheck {
    return new GuideRecheck(path.resolve(import.meta.dirname, "../.."));
  }

  private readonly stateFile: string;

  constructor(private readonly root: string) {
    // A detached HEAD has no name: every detached checkout of this worktree shares one state file.
    const branch = this.git("rev-parse", "--abbrev-ref", "HEAD").trim();
    this.stateFile = path.join(root, ".tmp/guides", `${branch.replaceAll("/", "__")}.json`);
  }

  /**
   * Called by `list_guides.ts`, `show_guides.ts` and the gate. The first call on a branch
   * records the baseline. State whose changes have all gone (the branch was merged, and the
   * name is in use again) is dropped first, so an old `shown` list cannot hide a title from the
   * new work.
   */
  begin(): void {
    const changes = this.changes("worktree");
    const state = this.read();
    const sawChanges = state !== null && (state.recheck !== null || Object.keys(state.baseline ?? {}).length > 0);
    if (state !== null && !(sawChanges && changes.length === 0)) return;
    this.write({ ...GuideRecheck.EMPTY, baseline: GuideRecheck.signatures(changes) });
  }

  shown(): string[] {
    return (this.read() ?? GuideRecheck.EMPTY).shown;
  }

  /** Picked but not printed yet, oldest first. */
  pending(): string[] {
    return (this.read() ?? GuideRecheck.EMPTY).picked;
  }

  recordRequest(requested: string[], printed: string[]): void {
    const state = this.read() ?? GuideRecheck.EMPTY;
    const shown = [...new Set([...state.shown, ...printed])];
    const picked = [...new Set([...state.picked, ...requested])].filter(slug => !shown.includes(slug));
    this.write({ ...state, shown, picked });
  }

  /**
   * `sinceStart: false` = no baseline, so `changes` is everything against the merge-base.
   * `fresh` changed since the previous re-check (on a first run: every file the session changed).
   * `gainedTokens` sizes what `fresh` added since then, and `newLines` are the added lines that
   * hold those tokens, the ones holding most first.
   */
  report(): {
    sinceStart: boolean;
    repeat: boolean;
    changes: FileChange[];
    fresh: string[];
    gainedTokens: number;
    newLines: { path: string; line: string }[];
  } {
    const state = this.started();
    const changes = this.sessionChanges(state);
    const previous = state.recheck;
    const fresh = changes.filter(change => previous?.signatures[change.path] !== change.signature);
    const perFile = fresh.map(change => {
      const before = previous?.tokens?.[change.path] ?? {};
      const gained = Object.entries(change.tokens).filter(([token, count]) => count > Math.max(before[token] ?? 0, 0));
      const words = new Set(gained.map(([token]) => token).filter(token => /^[\w$]+$/.test(token)));
      const seen = new Set(previous?.lineHashes[change.path] ?? []);
      const lines = change.added
        .filter(line => !seen.has(GuideRecheck.lineHash(line)))
        .map(line => ({
          path: change.path,
          line,
          hits: new Set((line.match(/[\w$]+/g) ?? []).filter(word => words.has(word))).size,
        }))
        .filter(({ hits }) => hits > 0);
      return {
        gained: gained.reduce((sum, [token, count]) => sum + count - Math.max(before[token] ?? 0, 0), 0),
        lines,
      };
    });
    return {
      sinceStart: state.baseline !== null,
      repeat: previous !== null,
      changes,
      fresh: fresh.map(change => change.path),
      gainedTokens: perFile.reduce((sum, file) => sum + file.gained, 0),
      newLines: perFile
        .flatMap(file => file.lines)
        .sort((a, b) => b.hits - a.hits)
        .map(({ path: file, line }) => ({ path: file, line })),
    };
  }

  recordRecheck(): void {
    const state = this.started();
    const changes = this.sessionChanges(state);
    this.write({
      ...state,
      recheck: {
        signatures: GuideRecheck.signatures(changes),
        tokens: Object.fromEntries(changes.map(change => [change.path, change.tokens])),
        lineHashes: Object.fromEntries(
          changes.map(change => [change.path, change.added.map(line => GuideRecheck.lineHash(line))])
        ),
      },
    });
  }

  /**
   * `null` = pass. Agents only: Claude Code sets `CLAUDECODE=1` in its Bash tool, and a person
   * pushing by hand is never held up. It fails on a file the session changed whose change the
   * last re-check did not see.
   */
  gateFailure(): string | null {
    if (process.env.CLAUDECODE !== "1") return null;
    const state = this.started();
    const unchecked = this.sessionChanges(state)
      .filter(change => state.recheck?.signatures[change.path] !== change.signature)
      .map(change => change.path);
    if (unchecked.length === 0) return null;
    const listed = unchecked.slice(0, 5).join(", ") + (unchecked.length > 5 ? `, … (${unchecked.length} files)` : "");
    return [
      `GUIDES RE-CHECK NOT DONE for code you changed: ${listed}`,
      "Run ./scripts/recheck_guides.ts, fix what it turns up, then run this again.",
      "The work is not finished while this step fails, even if every other step passes: do it before you",
      "report, commit or open a PR.",
    ].join("\n");
  }

  /**
   * The branch's state. With nothing recorded (a fresh checkout that never listed the guides),
   * the branch's commits become the baseline: this session did not write them. Uncommitted
   * edits still count, so coding without ever listing the guides does not pass the gate.
   */
  private started(): BranchState {
    const state = this.read();
    if (state !== null) return state;
    const fresh = { ...GuideRecheck.EMPTY, baseline: GuideRecheck.signatures(this.changes("head")) };
    this.write(fresh);
    return fresh;
  }

  private sessionChanges(state: BranchState): FileChange[] {
    const baseline = state.baseline ?? {};
    return this.changes("worktree").filter(change => baseline[change.path] !== change.signature);
  }

  /**
   * Against the merge-base with `origin/main`: `"worktree"` = commits, the working tree and
   * untracked files; `"head"` = commits only.
   */
  private changes(upTo: "worktree" | "head"): FileChange[] {
    const base = this.git("merge-base", "HEAD", "origin/main").trim();
    const listed = (...args: string[]) =>
      this.git("-c", "core.quotePath=false", ...args, "--", ...GuideRecheck.SOURCE_DIRS)
        .split("\n")
        .filter(line => line !== "");
    const files = [
      ...new Set(
        upTo === "head"
          ? listed("diff", "--name-only", "--no-renames", base, "HEAD")
          : [
              ...listed("diff", "--name-only", "--no-renames", base),
              ...listed("ls-files", "--others", "--exclude-standard"),
            ]
      ),
    ].sort();
    const befores = this.contentsAt(base, files);
    const committed = upTo === "head" ? this.contentsAt("HEAD", files) : [];
    return files.flatMap((file, index) => {
      const before = befores[index];
      const absolute = path.join(this.root, file);
      const onDisk = () => (existsSync(absolute) ? readFileSync(absolute, "utf8") : null);
      const after = upTo === "head" ? committed[index] : onDisk();
      const change = formatInsensitiveChange(before, after);
      if (change === null) return [];
      const had = new Set((before ?? "").split("\n").map(line => line.trim()));
      const added = (after ?? "")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "" && !had.has(line));
      return [{ path: file, before, after, ...change, added }];
    });
  }

  /** Each file's content at `commit`, `null` where it has none, in one `git cat-file --batch`. */
  private contentsAt(commit: string, files: string[]): (string | null)[] {
    if (files.length === 0) return [];
    const output = execFileSync("git", ["cat-file", "--batch"], {
      cwd: this.root,
      input: files.map(file => `${commit}:${file}\n`).join(""),
      maxBuffer: 1024 * 1024 * 1024,
    });
    let offset = 0;
    return files.map(() => {
      const headerEnd = output.indexOf("\n", offset);
      const header = output.subarray(offset, headerEnd).toString("utf8");
      offset = headerEnd + 1;
      const size = / blob (\d+)$/.exec(header);
      if (size === null) return null;
      const content = output.subarray(offset, offset + Number(size[1])).toString("utf8");
      offset += Number(size[1]) + 1;
      return content;
    });
  }

  private static signatures(changes: FileChange[]): Record<string, string> {
    return Object.fromEntries(changes.map(change => [change.path, change.signature]));
  }

  private static lineHash(line: string): string {
    return createHash("sha1").update(line).digest("hex").slice(0, 10);
  }

  /** `null` = nothing recorded for this branch. A file from before a field existed reads as that field's empty value. */
  private read(): BranchState | null {
    if (!existsSync(this.stateFile)) return null;
    return { ...GuideRecheck.EMPTY, ...(JSON.parse(readFileSync(this.stateFile, "utf8")) as Partial<BranchState>) };
  }

  private write(state: BranchState): void {
    mkdirSync(path.dirname(this.stateFile), { recursive: true });
    writeFileSync(this.stateFile, JSON.stringify(state));
  }

  private git(...args: string[]): string {
    return execFileSync("git", args, { cwd: this.root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  }
}
