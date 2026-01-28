import { z } from "zod";

import { route as createRoute } from "../lib/app-context.js";

export const route = createRoute("/api/hello", "GET", {
  query: {
    name: z.string().optional(),
  },
  handler: ({ query }) => {
    return {
      message: query.name ? `Hello, ${query.name}!` : "Hello from backend!",
    };
  },
});
