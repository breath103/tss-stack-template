import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { api } from "./api.js";

const app = new Hono();

// Register all API routes
api.register(app);

// Lambda handler export (production)
export const handler = handle(app);

// Local dev server
if (process.env.NODE_ENV !== "production") {
  const { serve } = await import("@hono/node-server");
  const port = 3001;
  console.log(`Backend running on http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}
