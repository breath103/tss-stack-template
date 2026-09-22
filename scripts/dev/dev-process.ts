import { type ChildProcess as NodeChildProcess, spawn } from "node:child_process";

const OUTPUT_TAIL_LINES = 20;

export class DevProcess {
  readonly name: string;
  private readonly child: NodeChildProcess;
  private readonly color: string;
  private _killed = false;
  private _exited = false;
  // Ring buffer of the last N stdout+stderr lines, surfaced in the crash reason
  // so background `start` callers see *why* a subprocess died, not just that
  // it did. Some tools (e.g. tsx) write fatal errors to stdout; capture both.
  private readonly outputTail: string[] = [];

  constructor(
    name: string,
    command: string,
    args: string[],
    options: { color: string; cwd?: string; env?: NodeJS.ProcessEnv; onCrash?: (reason: string) => void }
  ) {
    this.name = name;
    this.color = options.color;

    this.child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: options.cwd,
      env: options.env ? { ...process.env, ...options.env } : undefined,
    });

    this.child.stdout?.on("data", (d: Buffer) => {
      this.captureOutput(d);
      this.pipe(d, process.stdout);
    });
    this.child.stderr?.on("data", (d: Buffer) => {
      this.captureOutput(d);
      if (!this._killed) this.pipe(d, process.stderr);
    });

    this.child.on("exit", (code, signal) => {
      this._exited = true;
      if (!this._killed) {
        const header = `[${this.name}] crashed (code=${code}, signal=${signal})`;
        console.log(`\x1b[31m${header}\x1b[0m`);
        const tail = this.outputTail.length > 0 ? `\n${this.outputTail.join("\n")}` : "";
        options.onCrash?.(`${header}${tail}`);
      }
    });
  }

  private captureOutput(data: Buffer) {
    for (const line of data.toString().split("\n")) {
      if (!line) continue;
      this.outputTail.push(line);
      if (this.outputTail.length > OUTPUT_TAIL_LINES) this.outputTail.shift();
    }
  }

  get pid(): number | undefined {
    return this.child.pid;
  }

  /** Resolves with the first stdout chunk containing `pattern` (a RegExp resolves with its match). */
  waitForStdout(opts: { pattern: string | RegExp; timeout: number }): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.child.stdout?.off("data", onData);
        fn();
      };

      const timer = setTimeout(() => {
        settle(() => reject(new Error(`[${this.name}] timed out waiting for "${opts.pattern}" (${opts.timeout}ms)`)));
      }, opts.timeout);

      const onData = (d: Buffer) => {
        const text = d.toString();
        if (typeof opts.pattern === "string") {
          if (text.includes(opts.pattern)) settle(() => resolve(text));
          return;
        }
        const match = opts.pattern.exec(text);
        if (match) settle(() => resolve(match[0]));
      };
      this.child.stdout?.on("data", onData);

      this.child.on("exit", () => {
        settle(() => reject(new Error(`[${this.name}] exited before "${opts.pattern}" was found`)));
      });
    });
  }

  kill(): void {
    this._killed = true;
    try {
      this.child.kill("SIGTERM");
    } catch {
      /* already dead */
    }
  }

  /**
   * Resolves once the child has actually exited, escalating to SIGKILL after `timeout`.
   * A replacement that binds the same port must not spawn until this resolves — SIGTERM
   * returns long before the port is released.
   */
  waitForExit(timeout: number): Promise<void> {
    if (this._exited) return Promise.resolve();
    return new Promise(resolve => {
      const escalate = setTimeout(() => this.child.kill("SIGKILL"), timeout);
      this.child.once("exit", () => {
        clearTimeout(escalate);
        resolve();
      });
    });
  }

  private pipe(data: Buffer, stream: NodeJS.WriteStream) {
    for (const line of data.toString().split("\n")) {
      if (line) stream.write(`${this.color}[${this.name}]\x1b[0m ${line}\n`);
    }
  }
}
