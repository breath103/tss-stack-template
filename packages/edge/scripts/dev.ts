#!/usr/bin/env -S node --import tsx
process.title = "dev:edge";

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

const expectedHost = `${edge.devHost}:${edge.devPort}`;

const server = http.createServer((req, res) => {
  // The 127.0.0.1 socket below also answers to plain `localhost:<port>` and
  // `127.0.0.1:<port>`. Bounce those to the canonical devHost so cookies
  // can't quietly re-pile under `localhost` again.
  if (req.headers.host && req.headers.host !== expectedHost) {
    res.writeHead(308, { Location: `http://${expectedHost}${req.url ?? "/"}` });
    res.end();
    return;
  }

  const target = req.url?.startsWith("/api")
    ? `http://localhost:${backend.devPort}`
    : `http://localhost:${frontend.devPort}`;

  req.headers["x-forwarded-proto"] = "http";
  req.headers["x-forwarded-host"] = expectedHost;

  proxy.web(req, res, { target }, (err) => {
    res.writeHead(502);
    res.end(`Proxy error: ${err.message}`);
  });
});

server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, { target: `http://localhost:${frontend.devPort}` });
});

// Bind to 127.0.0.1 explicitly. Binding to `edge.devHost` directly would
// resolve to a single address family (IPv6 ::1 on macOS) and lock out
// IPv4-only clients like headless Chromium. Cookie isolation is enforced at
// the HTTP layer by the Host-header redirect above, not by the bind address.
server.on("error", (err: NodeJS.ErrnoException) => {
  const reason = err.code === "EADDRINUSE" ? `port ${edge.devPort} already in use` : err.message;
  console.error(`Edge proxy failed to start: ${reason}`);
  process.exit(1);
});
server.listen(edge.devPort, "127.0.0.1", () => {
  console.log(`Edge proxy running on http://${edge.devHost}:${edge.devPort}`);
  console.log(`  /api/* → http://localhost:${backend.devPort}`);
  console.log(`  /*     → http://localhost:${frontend.devPort}`);
});
