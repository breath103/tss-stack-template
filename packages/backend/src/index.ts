import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { api } from "./api.js";

const app = new Hono();

// Register all API routes
api.register(app);

// Export app for dev server
export { app };

// Lambda handler export
export const handler = handle(app);
