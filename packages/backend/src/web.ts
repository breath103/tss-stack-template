import { serve } from "@hono/node-server";

import { app } from "./index.js";

// Lambda Web Function entry point (AWS_LAMBDA_NODEJS_ENTRYPOINT). Lambda routes requests
// to the "host:port" it provides, and only once the server is listening there.
const endpoint = process.env.AWS_LAMBDA_HTTP_ENDPOINT;
if (!endpoint) throw new Error("AWS_LAMBDA_HTTP_ENDPOINT is not set");
const [hostname, port] = endpoint.split(":");

serve({ fetch: app.fetch, hostname, port: Number(port) });
