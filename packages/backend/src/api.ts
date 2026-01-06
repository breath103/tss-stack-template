import { z } from "zod";
import { createRoute, type ExtractRoutes } from "./lib/route.js";

export const api = createRoute({
  "/api/health": {
    GET: {
      handler: () => ({
        status: "ok" as const,
        timestamp: Date.now(),
        env: {
          REQUIRED_FOO: process.env.REQUIRED_FOO,
          OPTIONAL_FOO: process.env.OPTIONAL_FOO,
        },
      }),
    },
  },
  "/api/hello": {
    GET: {
      query: {
        name: z.string().optional(),
      },
      handler: ({ query }) => ({
        message: query.name ? `Hello, ${query.name}!` : "Hello from backend!",
      }),
    },
  },
  "/api/echo/:id": {
    POST: {
      params: {
        id: z.string(),
      },
      body: {
        message: z.string(),
        count: z.number().optional(),
      },
      handler: ({ params, body }) => ({
        echo: {
          id: params.id,
          message: body.message,
          count: body.count ?? 1,
        },
      }),
    },
  },
});

// Export type for frontend
export type ApiRoutes = ExtractRoutes<typeof api.routes>;
