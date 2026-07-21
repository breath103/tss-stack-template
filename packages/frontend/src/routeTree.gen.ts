import { rootRoute } from "./routes/__root";
import { aboutRoute } from "./routes/about";
import { designRoute } from "./routes/design/_route";
import { indexRoute } from "./routes/index";

export const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, designRoute]);
