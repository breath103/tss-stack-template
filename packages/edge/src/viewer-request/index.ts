// CloudFront Function: Extract subdomain from Host header and store in x-branch
// Runs at VIEWER_REQUEST before CloudFront modifies the Host header for S3 origin

import type { CloudFrontFunctionsEvent } from "aws-lambda";
import type { SubdomainMapValue, TssConfig } from "shared/config";

// Injected at build time from tss.json. DOMAIN_CONFIG is "" when no custom domain is set.
declare const SUBDOMAIN_MAP_CONFIG: TssConfig["subdomainMap"];
declare const DOMAIN_CONFIG: string;

const SUBDOMAIN_MAP = SUBDOMAIN_MAP_CONFIG;
const DOMAIN = DOMAIN_CONFIG;

/** Type guard for redirect entries */
function isRedirect(value: SubdomainMapValue): value is { redirect: string } {
  return typeof value === "object" && value !== null && "redirect" in value;
}

// Resolve a subdomain to its final branch by following any `redirect` chain in the
// map. Used when there is no custom domain — we can't 301 to a different host, so we
// just route to the redirect target's branch directly.
function resolveBranch(start: string): string {
  let current = start;
  for (let i = 0; i < 10; i++) {
    const v = SUBDOMAIN_MAP[current];
    if (v === undefined) return current;
    if (v === null) return "";
    if (typeof v === "string") return v;
    if (isRedirect(v)) {
      current = v.redirect;
      continue;
    }
    return current;
  }
  return current;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handler(event: CloudFrontFunctionsEvent) {
  const request = event.request;
  const host = request.headers.host?.value ?? "";

  // No custom domain: every request hits the cloudfront.net hostname, so
  // subdomain-based routing isn't meaningful. Always use the root subdomain
  // and follow any redirect chain in-process (we can't 301 to a host that
  // doesn't exist).
  if (!DOMAIN) {
    const branch = resolveBranch("");
    request.headers["x-branch"] = { value: branch };
    request.headers["x-forwarded-host"] = { value: host };
    return request;
  }

  // Extract subdomain: feature--test.example.com → feature--test
  // example.com → ""
  const parts = host.split(".");
  const subdomain = parts.length >= 3 ? parts[0] : "";

  const mapped = SUBDOMAIN_MAP[subdomain];

  if (isRedirect(mapped)) {
    // Handle redirect - return 301 response
    const targetSubdomain = mapped.redirect;
    const targetHost = targetSubdomain ? `${targetSubdomain}.${DOMAIN}` : DOMAIN;

    // Serialize querystring back (CloudFront parses it into an object)
    const qsParts: string[] = [];
    for (const k in request.querystring) {
      const v = request.querystring[k];
      const entries = v.multiValue || [v];
      for (let i = 0; i < entries.length; i++) {
        qsParts.push(k + "=" + entries[i].value);
      }
    }
    const qs = qsParts.join("&");

    const redirectUrl = `https://${targetHost}${request.uri}${qs ? `?${qs}` : ""}`;

    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: { value: redirectUrl },
        "cache-control": { value: "max-age=3600" },
      },
    };
  } else {
    // Apply mapping, or use subdomain as-is
    // null = blocked (will 404), undefined = use subdomain as-is
    const branch = mapped === null ? "" : (mapped ?? subdomain);

    // Store in custom headers for Lambda@Edge to read at origin-request
    request.headers["x-branch"] = { value: branch };
    request.headers["x-forwarded-host"] = { value: host };

    return request;
  }
}
