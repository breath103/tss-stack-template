import { rootRoute } from "./routes/__root";
import { aboutRoute } from "./routes/about";
import { indexRoute } from "./routes/index";

export const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);
