/// <reference types="aws-lambda" />

import { streamHandle } from "hono/aws-lambda";

import { app } from "./index.js";

// Use Hono's streamHandle which properly handles Set-Cookie headers
// by extracting them into the cookies array format required by Lambda streaming
type StreamHandler = ReturnType<typeof streamHandle>;
const _handler: StreamHandler = streamHandle(app);

// Object.assign copies the streaming marker symbol from _handler
// so Lambda still recognizes this as a streaming handler.
export const handler: StreamHandler = Object.assign(async (...args: Parameters<StreamHandler>) => {
  // Cron warmer: return early without processing
  const event: unknown = args[0];
  if (typeof event === "object" && event !== null && "source" in event && event.source === "warmer") {
    console.log("[warmer] ping");
    // In streaming Lambda, args are (event, responseStream, context).
    // The responseStream must be closed or the invocation hangs until timeout.
    // oxlint-disable-next-line local/no-double-cast -- awslambda streamifyResponse passes a Writable not typed as one
    const responseStream = args[1] as unknown as import("stream").Writable;
    responseStream.end();
    return;
  }

  await _handler(...args);

  // This runs after the lambda response stream is closed.
  // Add post-response tasks here (e.g. analytics flush).
}, _handler) as StreamHandler;
