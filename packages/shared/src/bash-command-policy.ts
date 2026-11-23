// Runs under plain `node` (type-stripping, no tsx) from `scripts/hook_bash_policy.mts` before every
// Bash tool call: erasable TypeScript only (no enums, no constructor parameter properties) and no
// imports, or the hook stops loading and fails open.

interface Word {
  /** Quotes and escapes removed: what the program receives. */
  text: string;
  /** Only the characters written outside quotes: what the shell itself still interprets. */
  bare: string;
}

interface Command {
  words: Word[];
  redirects: { fd: string; operator: string; target: string }[];
  /** Control operators between the previous command and this one. */
  joinedBy: string[];
}

class ShellScript {
  readonly commands: Command[] = [];
  /** Bodies of `$(…)`, backtick and `<(…)` substitutions. */
  readonly substituted: string[] = [];
  heredocs = 0;

  private static readonly REDIRECT = /(\d*)(<<<|<<-|<<|<>|<&|>>|>&|>\||&>>|&>|>|<)/y;
  private static readonly CONTROL = /;;|;|&&|\|\||\|&|\||&|\(|\)/y;
  private static readonly HEREDOC_OPEN = /<<-?\s*(['"]?)(\w+)\1/y;
  private static readonly WORD_END = " \t\n;&|<>()";

  private readonly source: string;
  private at = 0;
  private command: Command = { words: [], redirects: [], joinedBy: [] };
  private operators: string[] = [];
  private openHeredocs: { delimiter: string; stripTabs: boolean }[] = [];

  constructor(source: string) {
    this.source = source;
    while (this.at < source.length) this.step();
    this.endCommand();
  }

  private step() {
    const char = this.source[this.at];
    const next = this.source[this.at + 1];
    if (char === " " || char === "\t") {
      this.at++;
    } else if (char === "\\" && next === "\n") {
      this.at += 2;
    } else if (char === "\n") {
      this.at++;
      this.skipHeredocBodies();
      this.endCommand();
      this.operators.push("\n");
    } else if (char === "#") {
      this.at = this.indexOrEnd("\n", this.at);
    } else if ((char === "<" || char === ">") && next === "(") {
      this.at += 2;
      this.substituted.push(this.balanced());
      this.command.words.push({ text: "<(…)", bare: "" });
    } else {
      const redirect = this.match(ShellScript.REDIRECT);
      const control = redirect ? null : this.match(ShellScript.CONTROL);
      if (redirect) this.redirect(redirect[1], redirect[2]);
      else if (control) {
        this.endCommand();
        this.operators.push(control[0]);
      } else this.command.words.push(this.word());
    }
  }

  private redirect(fd: string, operator: string) {
    while (this.source[this.at] === " " || this.source[this.at] === "\t") this.at++;
    const target = this.word().text;
    if (operator === "<<" || operator === "<<-") {
      this.heredocs++;
      this.openHeredocs.push({ delimiter: target, stripTabs: operator === "<<-" });
    }
    this.command.redirects.push({ fd, operator, target });
  }

  private endCommand() {
    if (this.command.words.length === 0 && this.command.redirects.length === 0) return;
    if (this.commands.length > 0) this.command.joinedBy = this.operators;
    this.commands.push(this.command);
    this.command = { words: [], redirects: [], joinedBy: [] };
    this.operators = [];
  }

  private skipHeredocBodies() {
    for (const { delimiter, stripTabs } of this.openHeredocs) {
      while (this.at < this.source.length) {
        const end = this.indexOrEnd("\n", this.at);
        const line = this.source.slice(this.at, end);
        this.at = end + 1;
        if ((stripTabs ? line.replace(/^\t+/, "") : line) === delimiter) break;
      }
    }
    this.openHeredocs = [];
  }

  private word() {
    let text = "";
    let bare = "";
    while (this.at < this.source.length) {
      const char = this.source[this.at];
      const next = this.source[this.at + 1];
      if (ShellScript.WORD_END.includes(char)) break;
      if (char === "\\") {
        if (next !== "\n") text += this.source.charAt(this.at + 1);
        this.at += 2;
      } else if (char === "'") {
        const end = this.indexOrEnd("'", this.at + 1);
        text += this.source.slice(this.at + 1, end);
        this.at = end + 1;
      } else if (char === "$" && next === "'") {
        this.at += 2;
        text += this.ansiQuoted();
      } else if (char === '"') {
        this.at++;
        text += this.doubleQuoted();
      } else if (char === "`" || (char === "$" && next === "(")) {
        text += this.substitution();
      } else {
        text += char;
        bare += char;
        this.at++;
      }
    }
    return { text, bare };
  }

  private ansiQuoted() {
    let text = "";
    while (this.at < this.source.length && this.source[this.at] !== "'") {
      if (this.source[this.at] === "\\") this.at++;
      text += this.source[this.at] ?? "";
      this.at++;
    }
    this.at++;
    return text;
  }

  private doubleQuoted() {
    let text = "";
    while (this.at < this.source.length) {
      const char = this.source[this.at];
      const next = this.source.charAt(this.at + 1);
      if (char === '"') {
        this.at++;
        break;
      }
      if (char === "\\" && next !== "" && '$`"\\\n'.includes(next)) {
        if (next !== "\n") text += next;
        this.at += 2;
      } else if (char === "`" || (char === "$" && next === "(")) {
        text += this.substitution();
      } else {
        text += char;
        this.at++;
      }
    }
    return text;
  }

  /** Consumes `$(…)`, `` `…` `` or arithmetic `$((…))` and returns it verbatim. */
  private substitution() {
    const start = this.at;
    if (this.source.startsWith("$((", this.at)) {
      this.at = Math.min(this.indexOrEnd("))", this.at) + 2, this.source.length);
    } else if (this.source[this.at] === "`") {
      this.at++;
      let body = "";
      while (this.at < this.source.length && this.source[this.at] !== "`") {
        if (this.source[this.at] === "\\") this.at++;
        body += this.source[this.at] ?? "";
        this.at++;
      }
      this.at++;
      this.substituted.push(body);
    } else {
      this.at += 2;
      this.substituted.push(this.balanced());
    }
    return this.source.slice(start, this.at);
  }

  /** The text up to the `)` closing an already-consumed `(`. */
  private balanced() {
    const start = this.at;
    let depth = 1;
    while (this.at < this.source.length) {
      const char = this.source[this.at];
      const heredoc = char === "<" ? this.match(ShellScript.HEREDOC_OPEN) : null;
      if (heredoc) {
        // `$(cat <<'EOF' … EOF)`: the body is prose, and an apostrophe or `)` in it is not syntax.
        this.at = Math.min(this.indexOrEnd(`\n${heredoc[2]}`, this.at) + heredoc[2].length + 1, this.source.length);
      } else if (char === "\\") {
        this.at += 2;
      } else if (char === "'") {
        this.at = this.indexOrEnd("'", this.at + 1) + 1;
      } else if (char === '"') {
        this.at++;
        while (this.at < this.source.length && this.source[this.at] !== '"') {
          this.at += this.source[this.at] === "\\" ? 2 : 1;
        }
        this.at++;
      } else if (char === ")" && depth === 1) {
        this.at++;
        return this.source.slice(start, this.at - 1);
      } else {
        if (char === "(") depth++;
        if (char === ")") depth--;
        this.at++;
      }
    }
    return this.source.slice(start);
  }

  private match(pattern: RegExp) {
    pattern.lastIndex = this.at;
    const found = pattern.exec(this.source);
    if (found) this.at += found[0].length;
    return found;
  }

  private indexOrEnd(needle: string, from: number) {
    const index = this.source.indexOf(needle, from);
    return index === -1 ? this.source.length : index;
  }
}

/** One program being run: the head of a command, or what `xargs` / `find -exec` / `timeout` hands off to. */
class Invocation {
  readonly name: string;
  readonly args: Word[];
  readonly command: Command;
  /** False for the program after `find -exec`: the command's redirects are not its own. */
  readonly leads: boolean;

  constructor(name: string, args: Word[], command: Command, leads: boolean) {
    this.name = name;
    this.args = args;
    this.command = command;
    this.leads = leads;
  }

  /**
   * `leading` are the options before the first positional — the ones the program itself reads
   * rather than passes to a script or subcommand.
   */
  parse(takesValue: (option: string) => boolean) {
    const leading: string[] = [];
    const options: string[] = [];
    const positionals: string[] = [];
    for (let index = 0; index < this.args.length; index++) {
      const { text } = this.args[index];
      if (text.startsWith("-") && text !== "-") {
        options.push(text);
        if (positionals.length === 0) leading.push(text);
        if (takesValue(text)) index++;
      } else positionals.push(text);
    }
    return { leading, options, positionals };
  }

  mentions(pattern: RegExp) {
    return this.args.some(arg => pattern.test(arg.text));
  }
}

class CommandLine {
  readonly script: ShellScript;
  readonly invocations: Invocation[];

  private static readonly BLOCK_KEYWORDS = ["for", "while", "until", "if", "case", "select", "function"];
  private static readonly PREFIX_KEYWORDS = ["do", "then", "else", "elif", "while", "until", "if", "!", "{"];
  private static readonly WRAPPERS = [
    "sudo",
    "nohup",
    "env",
    "noglob",
    "time",
    "timeout",
    "caffeinate",
    "nice",
    "xargs",
  ];
  private static readonly XARGS_VALUE_FLAGS = ["-I", "-n", "-P", "-L", "-d", "-s", "-E", "-J", "-R"];
  private static readonly FIND_EXEC = ["-exec", "-execdir", "-ok"];
  private static readonly DEVICES = ["/dev/null", "/dev/stdout", "/dev/stderr", "/dev/tty"];
  private static readonly GLOB_OPTIONS = ["--include", "--exclude", "--exclude-dir", "--glob"];
  private static readonly GIT_VALUE_FLAGS = ["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--message"];
  private static readonly NODE_VALUE_FLAGS = ["-r", "--require", "--import", "--loader", "-C", "--conditions"];
  private static readonly NPM_VALUE_FLAGS = ["-w", "--workspace", "--prefix", "--registry", "--tag", "--otp"];
  private static readonly SHELLS = ["bash", "sh", "zsh"];

  constructor(source: string) {
    this.script = new ShellScript(source);
    this.invocations = this.script.commands.flatMap(command => CommandLine.invocationsOf(command));
  }

  /** Scripts this line hands to another shell: substitutions, `bash -c "<script>"`, `eval`. */
  nestedScripts() {
    return [
      ...this.script.substituted,
      ...this.script.commands.flatMap(({ words }) =>
        words.flatMap((word, index) => {
          const isShell = CommandLine.SHELLS.includes(CommandLine.basename(word.text));
          const script = words.at(index + 2);
          return isShell && /^-[a-z]*c$/.test(words[index + 1]?.text) && script ? [script.text] : [];
        })
      ),
      ...this.named("eval").map(evaluated => evaluated.args.map(arg => arg.text).join(" ")),
    ];
  }

  sequencesCommands() {
    return this.script.commands.some(command => {
      const joiner = command.joinedBy.find(operator => operator !== "(" && operator !== ")");
      const sequenced = joiner !== undefined && joiner !== "|" && joiner !== "|&";
      return sequenced || CommandLine.BLOCK_KEYWORDS.includes(command.words[0]?.bare);
    });
  }

  mergesStderr() {
    return this.script.commands.some(
      command =>
        command.joinedBy.includes("|&") ||
        command.redirects.some(({ fd, operator, target }) => operator === ">&" && fd === "2" && target === "1")
    );
  }

  runsInlineScript() {
    const python = this.invocations
      .filter(invocation => /^python[\d.]*$/.test(invocation.name))
      .map(invocation => invocation.parse(() => false));
    return (
      python.some(
        ({ leading, positionals }) => positionals[0] === "-" || leading.some(option => /^-\w*c$/.test(option))
      ) ||
      this.named("node", "tsx", "bun", "deno").some(runtime =>
        runtime
          .parse(option => CommandLine.NODE_VALUE_FLAGS.includes(option))
          .leading.some(option => option === "-e" || option.startsWith("--eval"))
      )
    );
  }

  editsInPlace() {
    return (
      this.named("sed", "gsed").some(sed =>
        sed.parse(option => /^-\w*[ef]$/.test(option)).options.some(option => /^-[nErsuz]*i|^--in-place/.test(option))
      ) ||
      this.named("perl").some(perl =>
        perl.parse(option => /^-\w*[eE]$/.test(option)).leading.some(option => /^-[0lnpawsc\d]*i/.test(option))
      ) ||
      this.named("awk", "gawk").some(awk =>
        awk.args.some((arg, index) => arg.text === "-i" && awk.args[index + 1]?.text === "inplace")
      )
    );
  }

  redirectsIntoFile() {
    const isFile = (target: string) => !CommandLine.DEVICES.includes(target);
    return (
      this.named("tee").some(tee => tee.parse(() => false).positionals.some(isFile)) ||
      this.named("cat", "echo", "printf").some(
        writer =>
          writer.leads &&
          writer.command.redirects.some(({ operator, target }) => {
            const duplicatesDescriptor = operator === ">&" && /^(?:\d+|-)$/.test(target);
            return operator.includes(">") && operator !== "<>" && !duplicatesDescriptor && isFile(target);
          })
      )
    );
  }

  passesUnquotedGlob() {
    return this.script.commands.some(({ words }) =>
      words.some((word, index) => {
        if (!/[*?[]/.test(word.bare)) return false;
        const option = words[index - 1]?.text;
        return (
          CommandLine.GLOB_OPTIONS.some(name => word.text.startsWith(`${name}=`)) ||
          CommandLine.GLOB_OPTIONS.includes(option) ||
          (option === "-g" && words[0].text === "rg")
        );
      })
    );
  }

  opensUrl() {
    return this.named("open").some(open => open.mentions(/^https?:\/\/|^[\w.-]*localhost\b/));
  }

  runsNpx() {
    return this.named("npx").length > 0 || ["exec", "x"].includes(this.npmSubcommand());
  }

  usesGitDashC() {
    return this.git().some(({ leading }) => leading.includes("-C"));
  }

  skipsGitHooks() {
    return (
      this.script.commands.some(command => command.words.some(word => word.bare === "HUSKY=0")) ||
      this.named("git").some(git => git.mentions(/core\.hooksPath/)) ||
      this.git().some(
        ({ options, positionals }) =>
          options.includes("--no-verify") ||
          (positionals[0] === "commit" && options.some(option => /^-[aqvseSpzio]*n/.test(option)))
      )
    );
  }

  stashesWithoutTag() {
    return this.git().some(({ options, positionals }) => {
      const verb = positionals.at(1);
      const tagged = options.some(option => /^-[a-z]*m$|^--message/.test(option));
      return positionals[0] === "stash" && (verb === "pop" || ((verb === undefined || verb === "push") && !tagged));
    });
  }

  mergesWithoutMergeCommit() {
    return this.named("gh").some(gh => {
      const { options, positionals } = gh.parse(option =>
        /^(?:-[RbtFA]|--repo|--body|--subject|--body-file)$/.test(option)
      );
      const merging = positionals[0] === "pr" && positionals[1] === "merge";
      return merging && options.some(option => /^--(?:squash|rebase)$|^-[dm]*[sr]/.test(option));
    });
  }

  named(...names: string[]) {
    return this.invocations.filter(invocation => names.includes(invocation.name));
  }

  private git() {
    return this.named("git").map(git =>
      git.parse(option => CommandLine.GIT_VALUE_FLAGS.includes(option) || /^-[a-zA-Z]*[mF]$/.test(option))
    );
  }

  private npmSubcommand() {
    const npm = this.named("npm").at(0);
    return npm?.parse(option => CommandLine.NPM_VALUE_FLAGS.includes(option)).positionals.at(0) ?? "";
  }

  private static invocationsOf(command: Command) {
    const { words } = command;
    const starts = [
      0,
      ...words.flatMap((word, index) => (CommandLine.FIND_EXEC.includes(word.text) ? [index + 1] : [])),
    ];
    return starts.flatMap(start => {
      let at = start;
      while (at < words.length) {
        const { text, bare } = words[at];
        if (/^[A-Za-z_]\w*=/.test(bare) || CommandLine.PREFIX_KEYWORDS.includes(bare)) {
          at++;
        } else if (CommandLine.WRAPPERS.includes(CommandLine.basename(text))) {
          at++;
          while (at < words.length && /^-|^\d/.test(words[at].text)) {
            at += CommandLine.XARGS_VALUE_FLAGS.includes(words[at].text) ? 2 : 1;
          }
        } else break;
      }
      if (at >= words.length) return [];
      return [new Invocation(CommandLine.basename(words[at].text), words.slice(at + 1), command, start === 0)];
    });
  }

  private static basename(path: string) {
    return path.slice(path.lastIndexOf("/") + 1);
  }
}

export class BashCommandPolicy {
  private static readonly RULES = [
    {
      id: "chain",
      message:
        "One command per Bash call. `;`, `&&`, `||`, a newline between two commands, and `for`/`while`/`if` blocks all run several: send each command as its own Bash call (independent ones together in one message, they run in parallel). A pipe into `head`/`grep`/`wc` is fine.",
      broken: line => line.sequencesCommands(),
    },
    {
      id: "cd",
      message:
        "No `cd` inside this repo. Every command runs from the repo root: pass the path as an argument, and use `npm <command> -w <package>` for a workspace. `cd` to an absolute path outside the repo (another checkout, e.g. the template) is allowed.",
      broken: line =>
        line.named("cd", "pushd", "popd").some(({ args }) => !BashCommandPolicy.leavesRepo(args.at(0)?.text ?? "")),
    },
    {
      id: "substitution",
      message:
        "No `$(…)`, backtick or `<(…)` command substitution; the shell runs it inside double quotes too. Run the inner command as its own Bash call and put its output in the next one. If the text is meant literally (a commit message, a PR body), single-quote the argument or escape it as `\\$(` and `` \\` ``.",
      broken: line => line.script.substituted.length > 0,
    },
    {
      id: "stderr-merge",
      message:
        "Drop `2>&1` (and `|&`). The Bash tool already returns stderr; when a pipe would hide it, run the command without the pipe.",
      broken: line => line.mergesStderr(),
    },
    {
      id: "heredoc",
      message:
        'No heredocs (`<<EOF`). Pass multi-line text as an ordinary quoted argument with literal newlines (`git commit -m "…"`, `--body "…"`), and create files with the Write tool. A `<<<` here-string is allowed.',
      broken: line => line.script.heredocs > 0,
    },
    {
      id: "inline-script",
      message:
        "No inline scripts (`python3 -`, `python3 -c`, `node -e`). To change a file use the Edit tool. To compute or inspect something, Write the script to a file in the scratchpad directory and run that file, or use `jq` / `node -p` for a one-line read.",
      broken: line => line.runsInlineScript(),
    },
    {
      id: "in-place-edit",
      message:
        "No in-place edits through the shell (`sed -i`, `perl -pi`, `awk -i inplace`). Use the Edit tool (`replace_all` for a rename across one file).",
      broken: line => line.editsInPlace(),
    },
    {
      id: "redirect-write",
      message:
        "No writing files with `cat`/`echo`/`printf` redirects or `tee <file>`. Use the Write tool to create a file and the Edit tool to change one. Redirecting to `/dev/null` is fine.",
      broken: line => line.redirectsIntoFile(),
    },
    {
      id: "unquoted-glob",
      message:
        "Quote the glob: zsh aborts an unquoted `--include=*.ts` with \"no matches found\" before grep runs. Write `--include='*.ts'`, or use the Grep tool.",
      broken: line => line.passesUnquotedGlob(),
    },
    {
      id: "npx",
      message:
        "Never `npx` (or `npm exec`). The repo has a script for it: `./scripts/lint.ts`, `./scripts/ci_local.ts`, `./scripts/knip.ts`, `./packages/<package>/scripts/*.ts`, or `npm run -w <package> <script>`.",
      broken: line => line.runsNpx(),
    },
    {
      id: "tsc",
      message:
        "Never run `tsc` directly. Typecheck with `./scripts/ci_local.ts --only typecheck`, or one program: `./packages/backend/scripts/build-types.ts`, `./packages/frontend/scripts/build-types.ts`, `./scripts/build_types.ts`, `./scripts/e2e_build_types.ts`, `npm run -w @modules/<name> typecheck`.",
      broken: line => line.named("tsc").length > 0 || line.named("npx").some(npx => npx.mentions(/^tsc$/)),
    },
    {
      id: "git-dash-c",
      message: "No `git -C <path>`. The Bash tool is already at the repo root: run `git` directly.",
      broken: line => line.usesGitDashC(),
    },
    {
      id: "no-verify",
      message:
        "Never skip git hooks (`--no-verify`, `git commit -n`, `HUSKY=0`, `core.hooksPath`). Fix what the hook reports: pre-commit is lint and typecheck of the staged trees, pre-push is `./scripts/ci_local.ts`.",
      broken: line => line.skipsGitHooks(),
    },
    {
      id: "git-stash",
      message:
        'No bare `git stash` or `git stash pop`. The stash stack is shared by every worktree, so a pop can take another session\'s changes. Set work aside with a WIP commit, or `git stash push -u -m "<unique tag>"` and restore it with `git stash apply <sha>`.',
      broken: line => line.stashesWithoutTag(),
    },
    {
      id: "gh-merge",
      message:
        "Merge PRs with a merge commit: `gh pr merge <n> --merge`, or `.claude/skills/do-task/scripts/cli.ts land-pr`. Never `--squash` or `--rebase`.",
      broken: line => line.mergesWithoutMergeCommit(),
    },
    {
      id: "open",
      message: "Never bash `open <url>`: it lands in the wrong browser. Use `./scripts/open-url.ts <url>`.",
      broken: line => line.opensUrl(),
    },
  ] as const satisfies readonly { id: string; message: string; broken: (line: CommandLine) => boolean }[];

  private static readonly REPO_ROOT = new URL("../../..", import.meta.url).pathname;

  private static leavesRepo(target: string) {
    if (!target.startsWith("/") || target.split("/").includes("..")) return false;
    return !`${target.replace(/\/+$/, "")}/`.startsWith(BashCommandPolicy.REPO_ROOT);
  }

  /** Null when the command may run. `reason` is written for the agent and names every broken rule. */
  static verdict(command: string) {
    const brokenIds = new Set<(typeof BashCommandPolicy.RULES)[number]["id"]>();
    const pending = [command];
    for (let source = pending.pop(); source !== undefined; source = pending.pop()) {
      const line = new CommandLine(source);
      for (const rule of BashCommandPolicy.RULES) if (rule.broken(line)) brokenIds.add(rule.id);
      pending.push(...line.nestedScripts());
    }
    if (brokenIds.size === 0) return null;

    const broken = BashCommandPolicy.RULES.filter(rule => brokenIds.has(rule.id));
    return {
      brokenRules: broken.map(rule => rule.id),
      reason: [
        "Rejected by this repo's shell rules (`.claude/rules/shell.md`, `CLAUDE.md`). Fix every item, then retry:",
        ...broken.map(({ id, message }) => `- ${id}: ${message}`),
      ].join("\n"),
    };
  }
}
