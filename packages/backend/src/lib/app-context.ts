import type { Context } from "hono";

import { auth } from "./auth.js";
import { routeFactory, routesFactory } from "./route.js";

export type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export type AppContext = Context<AppEnv>;

export const route = routeFactory<AppContext>();
export const routes = routesFactory<AppContext>();
