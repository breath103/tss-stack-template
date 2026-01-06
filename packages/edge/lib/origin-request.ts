import type {
  CloudFrontRequest,
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { sanitizeBranchName } from "@app/shared/branch";
import * as SSMParameters from "@app/shared/ssm-parameters";

// Injected at build time by esbuild
const PROJECT = process.env.PROJECT!;
const SSM_REGION = process.env.SSM_REGION!;

const ssm = new SSMClient({ region: SSM_REGION });

async function cachedFetch<V>(
  cache: Map<string, { value: V; expires: number }>,
  key: string,
  ttl: number,
  fetcher: (key: string) => Promise<V>
): Promise<V> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }
  const value = await fetcher(key);
  cache.set(key, { value, expires: Date.now() + ttl });
  return value;
}

const backendUrlCache = new Map<string, { value: string | null; expires: number }>();

/**
 * Get backend URL from SSM (with caching)
 */
async function getBackendUrl(branch: string): Promise<string | null> {
  const sanitizedBranchName = sanitizeBranchName(branch);
  return cachedFetch(backendUrlCache, sanitizedBranchName, 60 * 1000, async (key) => {
    try {
      const result = await ssm.send(
        new GetParameterCommand({ Name: SSMParameters.backendUrlName({ project: PROJECT, sanitizedBranchName: key }) })
      );
      return result.Parameter?.Value ?? null;
    } catch (e) {
      console.error(`SSM lookup failed for ${key}:`, e);
      return null;
    }
  });
}

export const handler = async (
  event: CloudFrontRequestEvent
): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  // Read branch from x-branch header set by CloudFront Function at viewer-request
  // (Host header is already changed to S3 origin domain by the time we get here)
  const branch = request.headers["x-branch"]?.[0]?.value;

  if (!branch) {
    return {
      status: "404",
      statusDescription: "Not Found",
      body: "Not Found",
    };
  }

  // API requests: route to backend Lambda
  if (uri.startsWith("/api/") || uri === "/api") {
    const backendUrl = await getBackendUrl(branch);

    if (!backendUrl) {
      return {
        status: "404",
        statusDescription: "Not Found",
        body: "Not Found",
      };
    }

    return rewriteToBackend(request, backendUrl);
  }

  // Frontend requests: prepend branch to S3 path
  // /dashboard → /{branch}/dashboard
  // / → /{branch}/index.html
  if (uri === "/" || uri === "") {
    request.uri = `/${branch}/index.html`;
  } else {
    request.uri = `/${branch}${uri}`;
  }

  return request;
};

function rewriteToBackend(
  request: CloudFrontRequest,
  backendUrl: string
): CloudFrontRequest {
  const url = new URL(backendUrl);

  request.origin = {
    custom: {
      domainName: url.hostname,
      port: 443,
      protocol: "https",
      path: "",
      sslProtocols: ["TLSv1.2"],
      readTimeout: 30,
      keepaliveTimeout: 5,
      customHeaders: {},
    },
  };

  request.headers.host = [{ key: "Host", value: url.hostname }];

  return request;
}
