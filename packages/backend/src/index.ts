import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { parse as parseCookies } from "hono/utils/cookie";

import { api } from "./api.js";
import { ApiError } from "./lib/api-error.js";
import type { AppEnv } from "./lib/app-context.js";
import { auth } from "./lib/auth.js";
import { registerToHono } from "./lib/hono-adapter.js";
import { SESSION_HASH_COOKIE, sessionHash } from "./lib/session-hash.js";
import type { ApiErrorBody } from "./types/api-error.js";

const app = new Hono<AppEnv>();

// Global error handler
app.onError((err, c) => {
  console.error("Request error:", err);

  if (err instanceof ApiError) {
    return c.json({ error: err.body }, err.status);
  } else if (err instanceof HTTPException) {
    return c.json({ error: { type: "http_error" } satisfies ApiErrorBody }, err.status);
  } else {
    return c.json({ error: { type: "internal_server_error" } satisfies ApiErrorBody }, 500);
  }
});

// Mount better-auth handler
app.on(["POST", "GET"], "/api/auth/*", c => auth.handler(c.req.raw));

// Session middleware - inject user into context
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session) {
    const hashCookie = (await auth.$context).createAuthCookie(SESSION_HASH_COOKIE).name;
    const cookieHeader = c.req.header("cookie");
    const seenHash = cookieHeader && parseCookies(cookieHeader, hashCookie)[hashCookie];
    if (seenHash !== sessionHash(session)) c.header("x-session-stale", "1");
  }
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

// Register all API routes
registerToHono(app, api);

export { app };
