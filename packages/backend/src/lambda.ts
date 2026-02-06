/// <reference types="aws-lambda" />

import { streamHandle } from "hono/aws-lambda";

import { app } from "./index.js";

// Use Hono's streamHandle which properly handles Set-Cookie headers
// by extracting them into the cookies array format required by Lambda streaming
export const handler: ReturnType<typeof streamHandle> = streamHandle(app);
