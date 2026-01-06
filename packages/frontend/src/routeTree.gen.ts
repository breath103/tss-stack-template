import { rootRoute } from "./routes/__root";
import { indexRoute } from "./routes/index";
import { aboutRoute } from "./routes/about";

export const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);
