/// <reference types="aws-lambda" />

import { streamHandle } from "hono/aws-lambda";

import { app } from "./index.js";

// Use Hono's streamHandle which properly handles Set-Cookie headers
// by extracting them into the cookies array format required by Lambda streaming
type StreamHandler = ReturnType<typeof streamHandle>;
const _handler: StreamHandler = streamHandle(app);

// Object.assign copies the streaming marker symbol from _handler
// so Lambda still recognizes this as a streaming handler.
export const handler: StreamHandler = Object.assign(
    async (...args: Parameters<StreamHandler>) => {
        await _handler(...args);

        // This runs after the lambda response stream is closed.
        // Add post-response tasks here (e.g. analytics flush).
    },
    _handler,
) as StreamHandler;
