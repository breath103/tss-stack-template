import { type APIRequestContext, type Page } from "playwright";
import { loadConfig } from "shared/config";

const BASE = `http://localhost:${loadConfig().edge.devPort}`;

// ─── Scenario shape (consumed by scripts/e2e/commands/run.ts) ────────

export type Scenario = (ctx: {
  /** Playwright Page. The BrowserContext has `baseURL` preset to the edge
   *  proxy, so `page.goto("/foo")` works without a prefix. Each scenario
   *  gets a fresh BrowserContext — no shared cookies/storage between runs. */
  page: Page;
  /** HTTP client bound to the SAME BrowserContext as `page`. It shares the
   *  cookie jar with the browser, so anything a scenario logs into via the
   *  UI carries through to these calls (and vice versa). Use this instead of
   *  global `fetch` whenever the request needs the session. */
  request: APIRequestContext;
}) => Promise<void>;

// ─── HTTP helper (raw fetch, for cookie-control scenarios) ───────────
//
// Most scenarios should use Playwright's `request` (the second `ctx` arg)
// because it shares cookies with `page`. Use this `api()` helper when a
// scenario needs explicit per-call control over which cookie / bearer is
// sent — for example, an auth flow that tests "no cookie" and "stale
// cookie" cases the same context would otherwise auto-fill.

export type JsonInput = string | number | boolean | null | undefined | JsonInput[] | { [k: string]: JsonInput };

interface ApiResponse<T> { status: number; body: T; setCookie: string | null }

interface ApiOpts {
  body?: JsonInput;
  headers?: Record<string, string>;
  /** Accepts `null` so callers can pass `response.headers.get("set-cookie")` directly. */
  cookie?: string | null;
  bearer?: string;
}

export async function api<T>(method: string, path: string, opts: ApiOpts = {}): Promise<ApiResponse<T>> {
  // `Origin` defaults to BASE so state-changing requests pass better-auth's
  // CSRF check. node `fetch` sends no Origin by default; setting it lets
  // harness traffic look like real same-origin requests.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Origin": BASE,
    ...opts.headers,
  };
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  if (opts.bearer) headers["Authorization"] = `Bearer ${opts.bearer}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* leave as raw text — non-JSON 5xx etc. */
  }
  return { status: res.status, body: parsed as T, setCookie: res.headers.get("set-cookie") };
}

export function readError(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return "";
}

// ─── Step reporter + harness wrapper (opt-in for multi-step scenarios) ─
//
// Plain `assert.equal(...)` stops on the first failure — fine for short
// scenarios. For scenarios with many independent checks, wrap the body in
// `harness(async (ctx) => { ... })` to get per-step pass/fail logging, a
// summary at the end, and `stepOrExit` for "subsequent steps depend on
// this." See `e2e/echo.ts` for the plain pattern; see CLAUDE.md for the
// harness pattern.

interface Step { name: string; ok: boolean; detail?: string }

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";

interface Reporter {
  /** Record a step. Continues regardless of pass/fail. */
  step: (name: string, ok: boolean, detail?: string) => void;
  /** Record a step; throws immediately if it fails. Use when subsequent
   *  steps depend on this one passing. Does NOT narrow types via `asserts`
   *  — TS does not propagate assertion signatures through arrow-function
   *  method types. Use an explicit `if (!x) throw` after this when you
   *  need TS narrowing on `x`. */
  stepOrExit: (name: string, ok: boolean, detail?: string) => void;
  /** Print a dim status line — e.g. "(driving long task — this takes ~30s)". */
  log: (line: string) => void;
}

type HarnessCtx = Reporter & {
  page: Page;
  request: APIRequestContext;
};

/**
 * Wrap a scenario body in a step reporter. Records pass/fail per step,
 * prints a summary at the end, and throws if any step failed — the runner
 * converts that into a `FAIL` line and non-zero exit.
 *
 *   export default harness(async ({ step, stepOrExit, log, request }) => {
 *     const r = await request.get("/api/things");
 *     stepOrExit("GET /api/things → 200", r.status() === 200);
 *     ...
 *   });
 */
export function harness(body: (ctx: HarnessCtx) => Promise<void>): Scenario {
  return async ({ page, request }) => {
    const steps: Step[] = [];
    const step = (name: string, ok: boolean, detail?: string): void => {
      steps.push({ name, ok, detail });
      const mark = ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      const tail = detail ? `  ${DIM}${detail}${RESET}` : "";
      console.log(`${mark} ${name}${tail}`);
    };
    const stepOrExit: Reporter["stepOrExit"] = (name, ok, detail) => {
      step(name, ok, detail);
      if (!ok) throw new Error(`step failed: ${name}${detail ? ` (${detail})` : ""}`);
    };
    const log = (line: string): void => {
      console.log(`${DIM}  ${line}${RESET}`);
    };

    let failed: Step[] = [];
    try {
      await body({ step, stepOrExit, log, page, request });
    } finally {
      failed = steps.filter((s) => !s.ok);
      console.log("");
      if (failed.length === 0) {
        console.log(`${GREEN}✅ all ${steps.length} steps passed${RESET}`);
      } else {
        console.log(`${RED}❌ ${failed.length}/${steps.length} steps failed${RESET}`);
        failed.forEach((s) => console.log(`   - ${s.name}${s.detail ? `  ${s.detail}` : ""}`));
      }
    }

    if (failed.length > 0) {
      throw new Error(`${failed.length}/${steps.length} steps failed`);
    }
  };
}
