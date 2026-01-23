import http from "node:http";
import { parseArgs } from "node:util";

import httpProxy from "http-proxy";

import { loadConfig } from "shared/config";

parseArgs({
  options: { env: { type: "string", short: "e" } },
  strict: false,
});

const config = loadConfig();
const { edge, backend, frontend } = config;

const proxy = httpProxy.createProxyServer({ xfwd: true });
proxy.on("error", () => {});

const server = http.createServer((req, res) => {
  const target = req.url?.startsWith("/api")
    ? `http://localhost:${backend.devPort}`
    : `http://localhost:${frontend.devPort}`;

  req.headers["x-forwarded-proto"] = "http";
  req.headers["x-forwarded-host"] = `localhost:${edge.devPort}`;

  proxy.web(req, res, { target }, (err) => {
    res.writeHead(502);
    res.end(`Proxy error: ${err.message}`);
  });
});

server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, { target: `http://localhost:${frontend.devPort}` });
});

server.listen(edge.devPort, () => {
  console.log(`Edge proxy running on http://localhost:${edge.devPort}`);
  console.log(`  /api/* → http://localhost:${backend.devPort}`);
  console.log(`  /*     → http://localhost:${frontend.devPort}`);
});
