import { z } from "zod";
import { route, routes, type ExtractRoutes } from "./lib/route.js";

export const api = routes(
  route("/api/health", "GET", {
    handler: async () => {
      return {
        status: "ok" as const,
        branch: "'main' backend",
        timestamp: Date.now(),
        env: {
          REQUIRED_FOO: process.env.REQUIRED_FOO,
          OPTIONAL_FOO: process.env.OPTIONAL_FOO,
        },
      };
    },
  }),

  route("/api/hello", "GET", {
    query: {
      name: z.string().optional(),
    },
    handler: ({ query }) => {
      return {
        message: query.name ? `Hello, ${query.name}!` : "Hello from backend!",
      };
    },
  }),

  route("/api/echo/:id", "POST", {
    body: {
      message: z.string(),
      count: z.number().optional(),
      optionalValue: z.number().optional(),
      complexPayload: z.object({
        tuple: z.tuple([z.string(), z.number(), z.number(), z.number()]),
      }),
    },
    handler: ({ params, body }) => ({
      echo: {
        id: params.id,
        message: body.message,
        count: body.count ?? 1,
        tupleFirst: body.complexPayload.tuple[0],
        tupleSecond: body.complexPayload.tuple[1],
      },
    }),
  })
);

// Export type for frontend
export type ApiRoutes = ExtractRoutes<typeof api.routes>;
