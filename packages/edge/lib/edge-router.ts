import type {
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from "aws-lambda";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

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
const CACHE_TTL = 60_000; // 1 minute

/**
 * Extract subdomain from host header
 * feature--test.example.com → feature--test
 * example.com → main
 */
function getSubdomain(host: string): string {
  const parts = host.split(".");
  return parts.length >= 3 ? parts[0] : "main";
}

/**
 * Get backend URL from SSM (with caching)
 */
async function getBackendUrl(branch: string): Promise<string | null> {
  return cachedFetch(backendUrlCache, branch, CACHE_TTL, async (key) => {
    try {
      const result = await ssm.send(
        new GetParameterCommand({ Name: `/${PROJECT}/backend/${key}` })
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
  const host = request.headers.host?.[0]?.value || "";

  const subdomain = getSubdomain(host);
  const backendUrl = await getBackendUrl(subdomain);

  if (!backendUrl) {
    const mainUrl = await getBackendUrl("main");
    if (!mainUrl) {
      return {
        status: "502",
        statusDescription: "Bad Gateway",
        body: "Backend not configured",
      };
    }
    return rewriteOrigin(request, mainUrl);
  }

  return rewriteOrigin(request, backendUrl);
};

function rewriteOrigin(
  request: CloudFrontRequestResult,
  backendUrl: string
): CloudFrontRequestResult {
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
