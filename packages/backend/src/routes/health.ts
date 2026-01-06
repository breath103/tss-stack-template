import { route as createRoute } from "../lib/app-context.js";

export const route = createRoute("/api/health", "GET", {
  handler: ({ c }) => {
    const user = c.get("user");
    return {
      status: "ok" as const,
      branch: "'branch1' backend",
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
});
