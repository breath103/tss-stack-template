# Backend on Lambda Web Functions

## Problem

The backend ran as a classic Lambda function behind a Function URL. A classic
execution environment serves exactly one request at a time, so concurrent
traffic means one environment (and one cold start) per in-flight request.

## Approach

Deploy the backend as an [AWS Lambda Web Function](https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html):
a plain Node.js HTTP server that Lambda runs and scales, where one execution
environment serves many requests concurrently.

Everything is CDK (`packages/backend/scripts/lib/backend-stack.ts`), using the
L1 constructs from aws-cdk-lib ≥ 2.273:

- `CfnWebFunction` — the container resource.
- `CfnWebFunctionRevision` — immutable code + config snapshot. Any change
  (code, env vars, timeout, concurrency) makes CloudFormation replace it with a
  new revision.
- `CfnWebFunctionEndpoint` — HomeRegion, `ApplicationManaged` auth (public,
  same as the Function URL it replaces), 100% weight on the current revision.
  Its `DomainName` is the `EndpointUrl` stack output, stored in SSM for the edge.

**Concurrency** is the `MAX_CONCURRENCY_PER_ENVIRONMENT` constant at the top of
`backend-stack.ts` (→ revision `serviceConfig.maxConcurrencyPerEnvironment`,
1–128, Lambda default 64). Lambda manages a dynamic per-environment limit below
this ceiling.

**Code delivery.** Lambda pulls a revision's zip from S3 itself, as the
`lambda.amazonaws.com` principal, pinned to an object version. The CDK bootstrap
bucket doesn't grant that principal, so the stack owns a versioned code bucket
whose policy allows `s3:GetObject{,Version}` scoped to this function's
revisions. `BucketDeployment` (`extract: false`) copies `dist/` as a zip; the
revision references its key and version ID. `prune: false` — deleting a version
a revision uses fails that revision permanently.

**Entry point.** `src/web.ts` starts `@hono/node-server` on
`AWS_LAMBDA_HTTP_ENDPOINT`; the revision sets `AWS_LAMBDA_NODEJS_ENTRYPOINT=web.js`.
The old `src/lambda.ts` stream handler and the 5-minute warmer are gone.

**Region.** Web Functions launched in us-east-1, us-east-2, us-west-2,
ap-northeast-1 and eu-west-1 only, so `backend.region` moved from ap-northeast-2
to us-west-2. SSM stays in its own region; the edge reads it unchanged.

**Arm64.** Web Functions run Node.js 24 on Arm64; `pack-install.ts` resolves the
deploy lockfile for `linux-arm64`.

## Key files

- `packages/backend/scripts/lib/backend-stack.ts` — the stack
- `packages/backend/src/web.ts` — server entry
- `packages/backend/scripts/{deploy,logs,pack-install}.ts`
- `.github/scripts/{smoke-deployment,backend-stack.test}.mjs`
- `tss.json` — `backend.region`

## Behaviour to know

- Logs land in `/aws/lambda/web/<fn>` (centralized) and `<fn>.local`
  (in-Region, available first). `platform.invokeSummary` reports requests per
  environment per minute.
- Scale-out bursts can return 429 (`lambda-web-error-type` header says which
  limit) while new environments initialize; new accounts start with reduced
  vCPU / RPS quotas.
- No WebSockets; HTTP/1.1 only; request headers capped at 128 KiB.
- `Host` must be the endpoint domain — the edge's `rewriteToBackend` already
  sets it.
- "Active" doesn't mean the server started. The smoke test is the real check.

## Verified (2026-10-14, production `main`)

Deployed from local with `deploy.ts --name=main --env=production`.
Health + anonymous `get-session` pass direct and via `www.tsss.cloud`.
A 200-request burst at 50 concurrency was served by 8 environments, one of
which handled 149 requests in its first minute (`invokeSummary`).
