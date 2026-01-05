import { Hono } from "hono";
import { handle } from "hono/aws-lambda";

const app = new Hono();

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() });
});

app.get("/api/hello", (c) => {
  return c.json({ message: "Hello from backend!" });
});

// Lambda handler export
export const handler = handle(app);

// Local dev server
if (process.env.NODE_ENV !== "production") {
  const { serve } = await import("@hono/node-server");
  const port = 3001;
  console.log(`Backend running on http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}
