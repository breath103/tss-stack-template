#!/usr/bin/env -S node --import tsx
process.title = "dev:edge";

import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
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

function createHandler(proto: "http" | "https", expectedHost: string) {
  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Each listener also answers to plain `localhost:<port>` and
    // `127.0.0.1:<port>`. Bounce those to the canonical devHost so cookies
    // can't quietly re-pile under `localhost` again.
    if (req.headers.host && req.headers.host !== expectedHost) {
      res.writeHead(308, { Location: `${proto}://${expectedHost}${req.url ?? "/"}` });
      res.end();
      return;
    }

    const target = req.url?.startsWith("/api") || req.url?.startsWith("/.well-known/oauth-") || req.url?.startsWith("/.well-known/openid-configuration")
      ? `http://localhost:${backend.devPort}`
      : `http://localhost:${frontend.devPort}`;

    req.headers["x-forwarded-proto"] = proto;
    req.headers["x-forwarded-host"] = expectedHost;

    proxy.web(req, res, { target }, (err) => {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    });
  };
}

const onUpgrade = (req: http.IncomingMessage, socket: import("node:stream").Duplex, head: Buffer) => {
  proxy.ws(req, socket, head, { target: `http://localhost:${frontend.devPort}` });
};

const onError = (port: number) => (err: NodeJS.ErrnoException) => {
  const reason = err.code === "EADDRINUSE" ? `port ${port} already in use` : err.message;
  console.error(`Edge proxy failed to start: ${reason}`);
  process.exit(1);
};

// Bind to 127.0.0.1 explicitly. Binding to `edge.devHost` directly would
// resolve to a single address family (IPv6 ::1 on macOS) and lock out
// IPv4-only clients like headless Chromium. Cookie isolation is enforced at
// the HTTP layer by the Host-header redirect above, not by the bind address.
const server = http.createServer(createHandler("http", `${edge.devHost}:${edge.devPort}`));
server.on("upgrade", onUpgrade);
server.on("error", onError(edge.devPort));
server.listen(edge.devPort, "127.0.0.1", () => {
  console.log(`Edge proxy running on http://${edge.devHost}:${edge.devPort}`);
  console.log(`  /api/* → http://localhost:${backend.devPort}`);
  console.log(`  /*     → http://localhost:${frontend.devPort}`);
});

// Optional HTTPS listener for clients that refuse plain http (MCP connectors).
// Enabled when a mkcert cert exists at .certs/ (repo root):
//   mkcert -cert-file .certs/dev.pem -key-file .certs/dev-key.pem <devHost> localhost
const certDir = path.resolve(import.meta.dirname, "../../../.certs");
const certFile = path.join(certDir, "dev.pem");
const keyFile = path.join(certDir, "dev-key.pem");
if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
  const httpsPort = edge.devPort + 3;
  const httpsServer = https.createServer(
    { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) },
    createHandler("https", `${edge.devHost}:${httpsPort}`)
  );
  httpsServer.on("upgrade", onUpgrade);
  httpsServer.on("error", onError(httpsPort));
  httpsServer.listen(httpsPort, "127.0.0.1", () => {
    console.log(`Edge proxy also running on https://${edge.devHost}:${httpsPort}`);
  });
}
