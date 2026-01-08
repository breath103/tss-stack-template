import { execSync } from "child_process";
import { build } from "esbuild";
import { createInterface } from "readline";
import path from "path";
import fs from "fs";
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { frontendBucketName, loadConfig, type TssConfig } from "@app/shared/config";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

interface EdgeStackProps extends cdk.StackProps {
  config: {
    project: string;
    ssmRegion: string;
    domain: string;
    hostedZoneId: string;
    frontendBucketName: string;    
  }
}

class EdgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EdgeStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Lambda@Edge for routing subdomains to backend URLs
    const originRequest = new cloudfront.experimental.EdgeFunction(
      this,
      "OriginRequestFunction",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(path.join(DIST, "origin-request")),
        timeout: cdk.Duration.seconds(5),
      }
    );

    // Allow Lambda@Edge to read SSM parameters
    originRequest.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${config.ssmRegion}:${this.account}:parameter/${config.project}/backend/*`,
        ],
      })
    );

    // S3 bucket for frontend assets
    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: config.frontendBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Origin Access Identity for CloudFront to access S3
    const oai = new cloudfront.OriginAccessIdentity(this, "OAI", {
      comment: `OAI for ${config.project} frontend`,
    });

    // Grant CloudFront read access to S3
    frontendBucket.grantRead(oai);

    // Import hosted zone
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      {
        hostedZoneId: config.hostedZoneId,
        zoneName: config.domain,
      }
    );

    // Create wildcard certificate for subdomains
    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: `*.${config.domain}`,
      subjectAlternativeNames: [config.domain],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const domainNames = [`*.${config.domain}`, config.domain];

    // Custom cache policy that includes x-branch header in cache key
    // Without this, all subdomains share the same cache entry
    const frontendCachePolicy = new cloudfront.CachePolicy(this, "FrontendCachePolicy", {
      cachePolicyName: `${config.project}-frontend`,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList("x-branch"),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      defaultTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // S3 origin for frontend assets
    const s3Origin = origins.S3BucketOrigin.withOriginAccessIdentity(frontendBucket, {
      originAccessIdentity: oai,
    });

    // CloudFront Function to extract subdomain at viewer-request
    // (before Host header is changed to S3 origin domain)
    const ViewerRequestFunction = new cloudfront.Function(this, "ViewerRequestFunction", {
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(DIST, "viewer-request/index.js"),
      }),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: frontendCachePolicy,
        functionAssociations: [
          {
            function: ViewerRequestFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
        edgeLambdas: [
          {
            functionVersion: originRequest.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        // API behavior: Lambda@Edge rewrites origin to backend Lambda URL at runtime
        "/api/*": {
          origin: s3Origin, // Placeholder - Lambda@Edge overwrites this in origin-request.ts

          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          functionAssociations: [
            {
              function: ViewerRequestFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
          edgeLambdas: [
            {
              functionVersion: originRequest.currentVersion,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            },
          ],
        },
      },
      certificate,
      domainNames,
    });

    // Wildcard record for subdomains
    new route53.ARecord(this, "WildcardARecord", {
      zone: hostedZone,
      recordName: `*.${config.domain}`,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution)
      ),
    });

    // Root domain record
    new route53.ARecord(this, "RootARecord", {
      zone: hostedZone,
      recordName: config.domain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution)
      ),
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, "Domain", {
      value: `https://${config.domain}`,
    });

    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
    });
  }
}

interface BuildOptions {
  subdomainMap: TssConfig["subdomainMap"];
  project: string;
  ssmRegion: string;
}

async function buildEdgeFunctions(opts: BuildOptions) {
  console.log("Building edge functions...");
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Build viewer-request CloudFront Function
  // CloudFront Functions require a global `handler` function (no exports).
  // treeShaking must be disabled because esbuild removes unexported functions as dead code.
  // Target ES2019 to compile away ?. and ?? (not supported in CloudFront Functions runtime).
  await build({
    entryPoints: [path.join(ROOT, "lib/viewer-request.ts")],
    bundle: true,
    platform: "neutral",
    target: "es2019",
    format: "esm",
    treeShaking: false,
    outfile: path.join(DIST, "viewer-request/index.js"),
    define: {
      SUBDOMAIN_MAP_CONFIG: JSON.stringify(opts.subdomainMap),
    },
  });

  // Build origin-request Lambda@Edge (runs on Node.js 24.x runtime)
  // CJS format for simpler Lambda compatibility (auto-detects exports.handler)
  await build({
    entryPoints: [path.join(ROOT, "lib/origin-request.ts")],
    bundle: true,
    platform: "node",
    target: "node24",
    format: "cjs",
    outfile: path.join(DIST, "origin-request/index.js"),
    define: {
      "process.env.PROJECT": JSON.stringify(opts.project),
      "process.env.SSM_REGION": JSON.stringify(opts.ssmRegion),
    },
  });
}

function synthesizeStack(config: EdgeStackProps["config"]) {
  console.log(`  project: ${config.project}`);
  console.log(`  ssm.region: ${config.ssmRegion}`);
  console.log(`  domain: ${config.domain}`);
  console.log(`  hostedZoneId: ${config.hostedZoneId}`);

  const app = new cdk.App({ outdir: path.join(ROOT, "cdk.out") });

  const stackName = `${config.project}-edge`;
  const stack = new EdgeStack(app, stackName, {
    config,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: "us-east-1",
    },
  });

  cdk.Tags.of(stack).add("project", config.project);

  app.synth();

  return stackName;
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function main() {
  const config = loadConfig();
  const command = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");

  if (command !== "deploy" && command !== "destroy") {
    console.error(`Usage: tsx scripts/edge-stack.ts <deploy|destroy> [--dry-run]`);
    process.exit(1);
  }

  // Sort of stupid but even for destroy this is needed
  await buildEdgeFunctions({
    subdomainMap: config.subdomainMap,
    project: config.project,
    ssmRegion: config.ssm.region,
  });

  const stackName = synthesizeStack({
    project: config.project,
    ssmRegion: config.ssm.region,
    domain: config.domain,
    hostedZoneId: config.hostedZoneId,
    frontendBucketName: frontendBucketName(config),
  });

  switch (command) {
    case "deploy": {
      console.log(`\nDeploying ${stackName}...`);

      if (dryRun) {
        console.log("\n--dry-run: Skipping CDK deploy");
        console.log(`Built files in ${DIST}:`);
        execSync(`ls -la ${DIST}`, { stdio: "inherit" });
      } else {
        execSync(
          `npx cdk deploy ${stackName} --app ./cdk.out --require-approval never`,
          { stdio: "inherit", cwd: ROOT }
        );
      }
      break;
    }

    case "destroy": {
      console.log(`\nThis will destroy the stack: ${stackName}`);
      console.log(`  - CloudFront distribution`);
      console.log(`  - Lambda@Edge functions`);
      console.log(`  - Route53 records`);
      console.log(`  - ACM certificate`);

      const confirmed = await confirm("\nAre you sure you want to destroy?");
      if (!confirmed) {
        console.log("Aborted.");
        process.exit(0);
      }

      console.log(`\nDestroying ${stackName}...`);
      execSync(
        `npx cdk destroy ${stackName} --app ./cdk.out`,
        { stdio: "inherit", cwd: ROOT }
      );
      break;
    }
  }
}

main();
