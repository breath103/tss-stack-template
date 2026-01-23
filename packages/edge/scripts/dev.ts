import http from "node:http";
import net from "node:net";
import { parseArgs } from "node:util";

import httpProxy from "http-proxy";
import open from "open";

import { loadConfig } from "@app/shared/config";

// Parse args to accept --env flag for consistency (not used by edge)
parseArgs({
  options: {
    env: { type: "string", short: "e" },
  },
  strict: false,
});

const config = loadConfig();
const { edge, backend, frontend } = config;

const proxy = httpProxy.createProxyServer({
  xfwd: true, // Adds x-forwarded-* headers
});

const server = http.createServer((req, res) => {
  const target = req.url?.startsWith("/api")
    ? `http://localhost:${backend.devPort}`
    : `http://localhost:${frontend.devPort}`;

  // Set x-forwarded-proto (xfwd only sets x-forwarded-for/host/port)
  req.headers["x-forwarded-proto"] = "http";
  req.headers["x-forwarded-host"] = `localhost:${edge.devPort}`;

  proxy.web(req, res, { target }, (err) => {
    res.writeHead(502);
    res.end(`Proxy error: ${err.message}`);
  });
});

// Handle WebSocket for HMR
server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, {
    target: `http://localhost:${frontend.devPort}`,
  });
});

server.listen(edge.devPort, () => {
  console.log(`Edge proxy running on http://localhost:${edge.devPort}`);
  console.log(`  /api/* → http://localhost:${backend.devPort}`);
  console.log(`  /*     → http://localhost:${frontend.devPort}`);

  // Wait for backend and frontend to be ready before opening browser
  waitForServers().then(() => {
    open(`http://localhost:${edge.devPort}`);
  });
});

async function waitForServers() {
  const ports = [
    { name: "backend", port: backend.devPort },
    { name: "frontend", port: frontend.devPort },
  ];

  console.log("\nWaiting for servers to be ready...");

  await Promise.all(
    ports.map(async ({ name, port }) => {
      await waitForPort(port);
      console.log(`  ${name} is ready (port ${port})`);
    }),
  );

  console.log("All servers ready, opening browser...\n");
}

function waitForPort(port: number, timeout = 60000): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for port ${port}`));
        return;
      }

      const socket = new net.Socket();

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        // Retry after a short delay
        setTimeout(tryConnect, 500);
      });

      socket.connect(port, "localhost");
    };

    tryConnect();
  });
}
