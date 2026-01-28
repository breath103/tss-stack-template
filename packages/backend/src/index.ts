/// <reference types="aws-lambda" />

import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";

import { api } from "./api.js";
import type { AppEnv } from "./lib/app-context.js";
import { auth } from "./lib/auth.js";
import { registerToHono } from "./lib/hono-adapter.js";

const app = new Hono<AppEnv>();

// Global error handler
app.onError((err, c) => {
  console.error("Request error:", err);

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  return c.json({ error: "Internal server error" }, 500);
});

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

// Standard Hono handler (used internally)
const honoHandler = handle(app);

// Lambda streaming handler - allows background tasks after response is sent
export const handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
  // Get response from Hono
  const result = await honoHandler(event, context);

  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: result.statusCode,
    headers: result.headers,
  });

  // Write body and end stream (sends response to client)
  if (result.body) {
    httpStream.write(result.body);
  }
  httpStream.end();

  // Background tasks run AFTER response is sent to client
  // Example: await analytics.flush();
});
