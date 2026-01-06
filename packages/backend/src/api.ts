import { routes } from "./lib/app-context.js";
import type { ExtractRoutes } from "./lib/route.js";
import { route as echoRoute } from "./routes/echo.js";
import { route as healthRoute } from "./routes/health.js";
import { route as helloRoute } from "./routes/hello.js";

export const api = routes(
  echoRoute,
  healthRoute,
  helloRoute
);

// Export type for frontend
export type ApiRoutes = ExtractRoutes<typeof api.routes>;
