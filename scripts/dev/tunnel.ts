import { spawnSync } from "node:child_process";

import { DevProcess } from "./dev-process.js";

export type TunnelState =
  // `dev.tunnel` is off in tss.json — no cloudflared is started.
  | { status: "disabled" }
  // `dev.tunnel` is on but the cloudflared binary is missing.
  | { status: "absent" }
  | { status: "down" }
  | { status: "ready"; url: string };

const HOSTNAME = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const MINT_TIMEOUT_MS = 20_000;
const POLL_MS = 30_000;
const FAILURES_BEFORE_REMINT = 2;
const EXIT_TIMEOUT_MS = 5000;

/**
 * cloudflared quick tunnel for the chat VMs, with liveness.
 *
 * trycloudflare drops a quick tunnel's hostname while the local `cloudflared` process stays
 * alive, so process liveness proves nothing and a dead tunnel surfaces only as an HTTP 500
 * inside a chat. cloudflared's own `/ready` reports `readyConnections`, which goes to 0 when
 * the tunnel loses its edge connections — that is the signal this polls.
 */
export class Tunnel {
  private process: DevProcess | null = null;
  private state: TunnelState = { status: "down" };
  private failures = 0;
  private notifying = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly options: {
      devPort: number;
      devHost: string;
      metricsPort: number;
      /** Every state change after `start()` resolves. The initial mint does not notify. */
      onChange: (state: TunnelState) => void;
    }
  ) {}

  current(): TunnelState {
    return this.state;
  }

  async start(): Promise<TunnelState> {
    if (spawnSync("cloudflared", ["--version"], { stdio: "ignore" }).status !== 0) {
      this.state = { status: "absent" };
      console.log(
        "\x1b[33mcloudflared not installed (brew install cloudflared): chat VMs cannot reach this dev server\x1b[0m"
      );
      return this.state;
    }
    await this.mint();
    this.timer = setInterval(() => void this.poll(), POLL_MS);
    this.timer.unref();
    this.notifying = true;
    return this.state;
  }

  kill(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.notifying = false;
    this.process?.kill();
  }

  private setState(state: TunnelState): void {
    this.state = state;
    if (this.notifying) this.options.onChange(state);
  }

  private async mint(): Promise<void> {
    const { devPort, devHost, metricsPort } = this.options;
    // The Host header is rewritten to the worktree's devHost because the edge 308s any other
    // host. `--protocol http2`: cloudflared's default QUIC (UDP 7844) is blocked on some
    // networks, where the quick tunnel gets a hostname but never connects and every request
    // answers 530. `--metrics` is pinned because the default binds the first free port of a
    // shared 20241-20245 pool — neither per-worktree nor predictable once five are running.
    // cloudflared logs to stderr, hence the `2>&1`.
    this.process = new DevProcess(
      "Tunnel",
      "sh",
      [
        "-c",
        `exec cloudflared tunnel --protocol http2 --url http://localhost:${devPort} --http-host-header ${devHost}:${devPort} --metrics 127.0.0.1:${metricsPort} 2>&1`,
      ],
      // Not fatal: only chat VMs need the tunnel, and trycloudflare.com does time out now
      // and then. Everything else in dev works without it.
      { color: "\x1b[36m", onCrash: reason => console.error(`\x1b[33m${reason}\x1b[0m`) }
    );
    try {
      const url = await this.process.waitForStdout({ pattern: HOSTNAME, timeout: MINT_TIMEOUT_MS });
      this.setState({ status: "ready", url });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`\x1b[33m${msg}: chat VMs cannot reach this dev server\x1b[0m`);
      this.setState({ status: "down" });
    }
  }

  private async poll(): Promise<void> {
    if (this.state.status !== "ready") return;
    if (await this.connected()) {
      this.failures = 0;
      return;
    }
    this.failures += 1;
    if (this.failures < FAILURES_BEFORE_REMINT) return;
    console.error(`\x1b[33m[Tunnel] ${this.state.url} has no edge connections — re-minting\x1b[0m`);
    this.failures = 0;
    // SIGKILL escalation matters here: the tunnel we are replacing is by definition wedged.
    this.process?.kill();
    await this.process?.waitForExit(EXIT_TIMEOUT_MS);
    await this.mint();
  }

  private async connected(): Promise<boolean> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.options.metricsPort}/ready`, {
        signal: AbortSignal.timeout(5000),
      });
      const body: unknown = await response.json();
      if (typeof body !== "object" || body === null || !("readyConnections" in body)) return false;
      const ready = body.readyConnections;
      return typeof ready === "number" && ready > 0;
    } catch {
      return false;
    }
  }
}
