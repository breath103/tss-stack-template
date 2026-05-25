import { type ChildProcess as NodeChildProcess, spawn } from "node:child_process";

const OUTPUT_TAIL_LINES = 20;

export class DevProcess {
  readonly name: string;
  private readonly child: NodeChildProcess;
  private readonly color: string;
  private _killed = false;
  // Ring buffer of the last N stdout+stderr lines, surfaced in the crash reason
  // so background `start` callers see *why* a subprocess died, not just that
  // it did. Some tools (e.g. tsx) write fatal errors to stdout; capture both.
  private readonly outputTail: string[] = [];

  constructor(name: string, command: string, args: string[], options: { color: string; cwd?: string; onCrash?: (reason: string) => void }) {
    this.name = name;
    this.color = options.color;

    this.child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], cwd: options.cwd });

    this.child.stdout?.on("data", (d: Buffer) => {
      this.captureOutput(d);
      this.pipe(d, process.stdout);
    });
    this.child.stderr?.on("data", (d: Buffer) => {
      this.captureOutput(d);
      if (!this._killed) this.pipe(d, process.stderr);
    });

    this.child.on("exit", (code, signal) => {
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

  waitForStdout(opts: { pattern: string; timeout: number }): Promise<void> {
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
        if (d.toString().includes(opts.pattern)) {
          settle(() => resolve());
        }
      };
      this.child.stdout?.on("data", onData);

      this.child.on("exit", () => {
        settle(() => reject(new Error(`[${this.name}] exited before "${opts.pattern}" was found`)));
      });
    });
  }

  kill(): void {
    this._killed = true;
    try { this.child.kill("SIGTERM"); } catch { /* already dead */ }
  }

  private pipe(data: Buffer, stream: NodeJS.WriteStream) {
    for (const line of data.toString().split("\n")) {
      if (line) stream.write(`${this.color}[${this.name}]\x1b[0m ${line}\n`);
    }
  }
}
