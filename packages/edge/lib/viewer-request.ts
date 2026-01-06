// CloudFront Function: Extract subdomain from Host header and store in x-branch
// Runs at VIEWER_REQUEST before CloudFront modifies the Host header for S3 origin

import type { CloudFrontFunctionsEvent } from "aws-lambda";

function handler(event: CloudFrontFunctionsEvent) {
  const request = event.request;
  const host = request.headers.host?.value ?? "";

  // Extract subdomain: feature--test.example.com → feature--test
  // example.com → main
  const parts = host.split(".");
  const branch = parts.length >= 3 ? parts[0] : "main";

  // Store in custom header for Lambda@Edge to read at origin-request
  request.headers["x-branch"] = { value: branch };

  return request;
}
