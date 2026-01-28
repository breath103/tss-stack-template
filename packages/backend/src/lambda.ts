/// <reference types="aws-lambda" />

import { handle } from "hono/aws-lambda";

import { app } from "./index.js";

const honoHandler = handle(app);

// Lambda streaming handler - allows background tasks after response is sent
export const handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
  // Get response from Hono
  const result = await honoHandler(event, context);

  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: result.statusCode,
    headers: result.headers,
  });

  // Write body and end stream (sends response to client)
  if (result.body) {
    httpStream.write(result.body);
  }
  httpStream.end();

  // Background tasks run AFTER response is sent to client
  // Example: await analytics.flush();
});
