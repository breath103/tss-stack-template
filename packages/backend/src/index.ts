import { Hono } from "hono";
import { handle } from "hono/aws-lambda";

import { api } from "./api.js";
import type { AppEnv } from "./lib/app-context.js";
import { auth } from "./lib/auth.js";
import { registerToHono } from "./lib/hono-adapter.js";

const app = new Hono<AppEnv>();

// Mount better-auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Session middleware - inject user into context
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

// Register all API routes
registerToHono(app, api);

// Export app for dev server
export { app };

// Lambda handler export
export const handler = handle(app);
