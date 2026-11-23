import { rootRoute } from "./routes/__root";
import { indexRoute } from "./routes/$index/_route";
import { aboutRoute } from "./routes/about/_route";
import { designRoute } from "./routes/design/_route";

export const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, designRoute]);
