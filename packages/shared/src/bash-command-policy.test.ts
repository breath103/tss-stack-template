import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { BashCommandPolicy } from "./bash-command-policy.js";

const ALLOWED = [
  "./scripts/ci_local.ts --only test",
  "./packages/backend/scripts/build-types.ts",
  ".claude/skills/do-task/scripts/cli.ts land-pr",
  "npm test -w backend -w frontend",
  "gh pr checks 1002",
  "git add packages/shared/src/a.ts scripts/b.ts",
  "git status --short | head -20",
  "grep -rn foo packages | grep -c bar",
  "./scripts/lint.ts --fix |\n  tail -5",
  "ls packages \\\n  modules",
  "# what this does\ngit status",
  "git status;",
  "\n\ngit status\n",
  "cd /Users/someone/Work/other-checkout",
  `cd ${fileURLToPath(new URL("../../..", import.meta.url))}`,

  'git commit -m "a && b; c || d"',
  'git commit -m "Title\n\nBody line one; still the body.\n- cd into nothing\n- 2>&1 is text here"',
  'grep -n "cd " README.md',
  "grep -n 'git stash pop && npx tsc' CLAUDE.md",
  "gh pr create --title T --body 'Run `npm test` and $(nothing) <<EOF'",
  'gh pr create --title T --body "Escaped \\`code\\` and \\$(text) stay literal"',
  "echo $'it\\'s; fine'",
  "echo $((1 + 2))",
  "find . -name '*.ts' -exec grep -l foo {} \\;",

  "./packages/backend/scripts/build-types.ts > /dev/null",
  "./scripts/lint.ts 2>/dev/null",
  "echo failed >&2",
  "gh api repos/o/r/pulls > .tmp/pulls.json",
  "jq .name <<< '{\"name\":1}'",
  "sed -n 1,40p scripts/lint.ts",
  "sed -n -e 1p -e '/-i/p' scripts/lint.ts",
  "perl -ne 'print if /x/' file.txt",
  "node scripts/tool.mjs -e production",
  "node -p \"require('./package.json').version\"",
  "python3 .tmp/report.py -c config.ini",
  "python3 -m json.tool .tmp/a.json",
  "cat packages/a.ts packages/b.ts",

  "grep -rn foo --include='*.ts' --exclude-dir=node_modules packages",
  'grep -rn foo --include="*.{ts,tsx}" packages',
  "grep -rn foo --include \\*.ts packages",
  "rg foo -g '*.ts'",

  "curl -s https://example.com/health",

  "command -v npx",
  "npm run -w @modules/ui typecheck",
  "npm install -D vitest -w shared",
  "git diff -C origin/main",
  "git -c core.editor=true rebase --continue",
  "git commit --no-edit --amend",
  'git commit -m "explain --no-verify"',
  "git stash list",
  'git stash push -u -m "wip-1002"',
  "git stash apply 4f2a9c1",
  "gh pr merge 1002 --merge --delete-branch",
  "gh pr merge 1002 -m -d",
  "./scripts/open-url.ts https://example.com",
  "open -a Simulator",
];

const REJECTED: [command: string, brokenRules: string[]][] = [
  ["git add a.ts; git commit -m x", ["chain"]],
  ["git add a.ts && git commit -m x", ["chain"]],
  ["npm test -w shared || echo failed", ["chain"]],
  ["git add a.ts\ngit commit -m x", ["chain"]],
  ['git commit -m "one\ntwo"\ngit push', ["chain"]],
  ["./scripts/dev.ts start & ./scripts/lint.ts", ["chain"]],
  ["for f in a b; do cat $f; done", ["chain"]],
  ["while read line; do echo $line; done < list.txt", ["chain"]],
  ["if [ -f a ]; then cat a; fi", ["chain"]],
  ["(ls; pwd)", ["chain"]],

  ["cd packages/backend", ["cd"]],
  ["pushd modules/db", ["cd"]],
  ["cd", ["cd"]],
  ["cd /other/../etc", ["cd"]],
  [`cd ${fileURLToPath(new URL("../../../packages", import.meta.url))}`, ["cd"]],
  ["cd packages/backend && npx tsc --noEmit 2>&1 | tail -5", ["chain", "cd", "stderr-merge", "npx", "tsc"]],

  ["echo $(git rev-parse HEAD)", ["substitution"]],
  ["echo `git rev-parse HEAD`", ["substitution"]],
  ['git commit -m "fix $(date)"', ["substitution"]],
  ['gh pr create --title T --body "Run `npm test` first"', ["substitution"]],
  ["diff <(sort a) <(sort b)", ["substitution"]],
  ["echo $(cd packages && ls)", ["chain", "cd", "substitution"]],

  ["npm test -w backend 2>&1 | tail -5", ["stderr-merge"]],
  ["./scripts/lint.ts > .tmp/lint.log 2>&1", ["stderr-merge"]],
  ["./scripts/lint.ts |& tail", ["stderr-merge"]],

  ["cat <<EOF\nhello; world && more\ncd nowhere\nEOF", ["heredoc"]],
  ["python3 - <<'EOF'\nprint('a; b')\nEOF", ["heredoc", "inline-script"]],
  [
    "git commit -m \"$(cat <<'EOF'\nIt's a title (really)\n\nBody; with && text.\nEOF\n)\"",
    ["substitution", "heredoc"],
  ],
  ["cat > notes.md <<-EOF\n\ttext\n\tEOF", ["heredoc", "redirect-write"]],

  ['python3 -c "print(1)"', ["inline-script"]],
  ["python -Ic 'print(1)'", ["inline-script"]],
  ["curl -s https://example.com/a.json | python3 -", ["inline-script"]],
  ["node -e 'console.log(1)'", ["inline-script"]],
  ["node --import tsx --eval 'console.log(1)'", ["inline-script"]],
  ["timeout 30 node -e 'console.log(1)'", ["inline-script"]],

  ["sed -i '' 's/a/b/' file.ts", ["in-place-edit"]],
  ["sed -Ei.bak 's/a/b/' file.ts", ["in-place-edit"]],
  ["sed -e 's/a/b/' --in-place file.ts", ["in-place-edit"]],
  ["perl -pi -e 's/a/b/' file.ts", ["in-place-edit"]],
  ["perl -0pi -e 's/a/b/' file.ts", ["in-place-edit"]],
  ["grep -rl foo src | xargs sed -i '' 's/foo/bar/'", ["in-place-edit"]],
  ["find src -name '*.ts' -exec sed -i '' 's/a/b/' {} +", ["in-place-edit"]],

  ["echo hello > notes.md", ["redirect-write"]],
  ["printf '%s\\n' a b >> notes.md", ["redirect-write"]],
  ["cat a.ts b.ts > c.ts", ["redirect-write"]],
  ["./scripts/lint.ts | tee .tmp/lint.log", ["redirect-write"]],

  ["grep -rn foo --include=*.ts packages", ["unquoted-glob"]],
  ["grep -rn foo packages --exclude=*.test.ts", ["unquoted-glob"]],
  ["grep -rn foo --include=*.{ts,tsx} packages", ["unquoted-glob"]],
  ["grep -rn foo --include *.ts packages", ["unquoted-glob"]],
  ["rg foo -g *.ts", ["unquoted-glob"]],

  ["npx vitest run", ["npx"]],
  ["npm exec -- vitest run", ["npx"]],
  ["tsc -p packages/backend/tsconfig.json", ["tsc"]],
  ["./node_modules/.bin/tsc --noEmit", ["tsc"]],
  ["git -C ../other-checkout status", ["git-dash-c"]],
  ['git commit --no-verify -m "x"', ["no-verify"]],
  ['git commit -nm "x"', ["no-verify"]],
  ["git push --no-verify", ["no-verify"]],
  ["HUSKY=0 git push", ["no-verify"]],
  ["git -c core.hooksPath=/dev/null commit -m x", ["no-verify"]],
  ["git stash", ["git-stash"]],
  ["git stash -u", ["git-stash"]],
  ["git stash pop", ["git-stash"]],
  ["gh pr merge 1002 --squash", ["gh-merge"]],
  ["gh pr merge 1002 -sd", ["gh-merge"]],
  ["gh pr merge --rebase", ["gh-merge"]],
  ["open https://github.com/o/r/pull/1", ["open"]],
  ["open http://myapp-2.localhost:3000/about", ["open"]],

  ["bash -c 'cd packages && ls'", ["chain", "cd"]],
  ["./scripts/with-env.sh --env=test bash -c 'npx vitest run'", ["npx"]],
  ['eval "git stash pop"', ["git-stash"]],
];

describe("BashCommandPolicy.verdict", () => {
  it.each(ALLOWED)("allows %j", command => {
    expect(BashCommandPolicy.verdict(command)).toBeNull();
  });

  it.each(REJECTED)("rejects %j", (command, brokenRules) => {
    expect(BashCommandPolicy.verdict(command)?.brokenRules).toEqual(brokenRules);
  });

  it("names every broken rule and its replacement in the reason", () => {
    const reason = BashCommandPolicy.verdict("cd packages/backend && npx vitest run")?.reason;
    expect(reason).toContain("- chain: One command per Bash call");
    expect(reason).toContain("- cd: No `cd`");
    expect(reason).toContain("- npx: Never `npx`");
    expect(reason).not.toContain("- tsc:");
  });
});

// The real entry under plain `node`: the one check that fails when this module stops being
// erasable TypeScript, which typecheck, lint and vitest all accept.
describe("scripts/hook_bash_policy.mts", () => {
  const entry = fileURLToPath(new URL("../../../scripts/hook_bash_policy.mts", import.meta.url));
  const run = (input: string) => spawnSync(entry, { input, encoding: "utf8" });
  const payload = (command: string) =>
    JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command } });

  it("prints nothing and exits 0 for an allowed command", () => {
    expect(run(payload("git status"))).toMatchObject({ status: 0, stdout: "", stderr: "" });
  });

  it("denies a rejected command through hookSpecificOutput", () => {
    const { status, stdout } = run(payload("git add a.ts && git commit -m x"));
    expect(status).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: BashCommandPolicy.verdict("git add a.ts && git commit -m x")?.reason,
      },
    });
  });

  it("fails open on input it cannot read", () => {
    const { status, stdout, stderr } = run("not json");
    expect({ status, stdout }).toEqual({ status: 0, stdout: "" });
    expect(stderr).toContain("hook_bash_policy crashed, command allowed");
  });
});
