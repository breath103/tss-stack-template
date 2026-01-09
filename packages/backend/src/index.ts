import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { api } from "./api.js";
import { auth } from "./lib/auth.js";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

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
api.register(app);

// Export app for dev server
export { app };

// Lambda handler export
export const handler = handle(app);
