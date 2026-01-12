// CloudFront Function: Extract subdomain from Host header and store in x-branch
// Runs at VIEWER_REQUEST before CloudFront modifies the Host header for S3 origin

import type { CloudFrontFunctionsEvent } from "aws-lambda";

import type { TssConfig } from "@app/shared/config";

// Injected at build time from tss.json
declare const SUBDOMAIN_MAP_CONFIG: TssConfig["subdomainMap"];
const SUBDOMAIN_MAP = SUBDOMAIN_MAP_CONFIG;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handler(event: CloudFrontFunctionsEvent) {
  const request = event.request;
  const host = request.headers.host?.value ?? "";

  // Extract subdomain: feature--test.example.com → feature--test
  // example.com → ""
  const parts = host.split(".");
  const subdomain = parts.length >= 3 ? parts[0] : "";

  // Apply mapping, or use subdomain as-is
  // null = blocked (will 404), undefined = use subdomain as-is
  const mapped = SUBDOMAIN_MAP[subdomain];
  const branch = mapped === null ? "" : (mapped ?? subdomain);

  // Store in custom headers for Lambda@Edge to read at origin-request
  request.headers["x-branch"] = { value: branch };
  request.headers["x-forwarded-host"] = { value: host };

  return request;
}
