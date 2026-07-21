import { createRoute } from "@tanstack/react-router";

import { rootRoute } from "../__root";
import { DesignPage } from "./DesignPage";

export const designRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/design",
  component: DesignPage,
});
