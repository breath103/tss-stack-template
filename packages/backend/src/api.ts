import { z } from "zod";
import { route, routes } from "./lib/app-context.js";
import type { ExtractRoutes } from "./lib/route.js";

export const api = routes(
  route("/api/health", "GET", {
    handler: async ({ c }) => {
      const user = c.get("user");
      return {
        status: "ok" as const,
        branch: "'main' backend",
        timestamp: Date.now(),
        envs: {
          REQUIRED_FOO: process.env.REQUIRED_FOO,
          OPTIONAL_FOO: process.env.OPTIONAL_FOO,
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
          BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        },
        user: user ? { id: user.id, name: user.name, email: user.email } : null,
      };
    },
  }),

  // Debug endpoint: uncomment to inspect headers at backend layer
  // route("/api/backend-echo", "GET", {
  //   handler: ({ c }) => {
  //     const headers: Record<string, string> = {};
  //     c.req.raw.headers.forEach((value, key) => {
  //       headers[key] = value;
  //     });
  //     return { layer: "backend", url: c.req.url, headers };
  //   },
  // }),

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
