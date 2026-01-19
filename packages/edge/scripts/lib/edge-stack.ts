import path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

import { GitHubActionsIam } from "./github-actions-iam.js";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIST = path.join(ROOT, "dist");

export interface EdgeStackConfig {
  project: string;
  ssmRegion: string;
  domain: string;
  hostedZoneId: string;
  frontendBucketName: string;
  githubActionsIamRole?: { repo: string };
}

interface EdgeStackProps extends cdk.StackProps {
  config: EdgeStackConfig;
}

export class EdgeStack extends cdk.Stack {
  static readonly region = "us-east-1";

  static id({ project }: { project: string }): string {
    return `${project}-edge`;
  }

  static originRequestFunctionName({ project }: { project: string }): string {
    return `${project}-edge-origin-request`;
  }

  static viewerRequestFunctionName({ project }: { project: string }): string {
    return `${project}-edge-viewer-request`;
  }

  constructor(scope: Construct, props: EdgeStackProps) {
    const id = EdgeStack.id({ project: props.config.project });
    super(scope, id, {
      ...props,
      env: { account: props.env?.account, region: EdgeStack.region },
    });

    const config = props.config;

    const originRequestFunction = this.createOriginRequestFunction(config);
    const viewerRequestFunction = this.createViewerRequestFunction(config);
    const { bucket, oai } = this.createFrontendBucket(config);
    const { hostedZone, certificate } = this.createCertificate(config);
    const distribution = this.createDistribution(config, originRequestFunction, viewerRequestFunction, bucket, oai, certificate);
    this.createDnsRecords(config, hostedZone, distribution);
    this.createOutputs(config, distribution, bucket);

    if (config.githubActionsIamRole) {
      new GitHubActionsIam(this, "GitHubActionsIam", {
        project: config.project,
        repo: config.githubActionsIamRole.repo,
      });
    }
  }

  private createOriginRequestFunction(config: EdgeStackConfig): cloudfront.experimental.EdgeFunction {
    const fn = new cloudfront.experimental.EdgeFunction(this, "OriginRequestFunction", {
      functionName: EdgeStack.originRequestFunctionName({ project: config.project }),
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(DIST, "origin-request")),
      timeout: cdk.Duration.seconds(5),
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${config.ssmRegion}:${this.account}:parameter/${config.project}/backend/*`,
        ],
      })
    );

    return fn;
  }

  private createViewerRequestFunction(config: EdgeStackConfig): cloudfront.Function {
    return new cloudfront.Function(this, "ViewerRequestFunction", {
      functionName: EdgeStack.viewerRequestFunctionName({ project: config.project }),
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(DIST, "viewer-request/index.js"),
      }),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });
  }

  private createFrontendBucket(config: EdgeStackConfig): {
    bucket: s3.Bucket;
    oai: cloudfront.OriginAccessIdentity;
  } {
    const bucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: config.frontendBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const oai = new cloudfront.OriginAccessIdentity(this, "OAI", {
      comment: `OAI for ${config.project} frontend`,
    });

    bucket.grantRead(oai);

    return { bucket, oai };
  }

  private createCertificate(config: EdgeStackConfig): {
    hostedZone: route53.IHostedZone;
    certificate: acm.Certificate;
  } {
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: config.hostedZoneId,
      zoneName: config.domain,
    });

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: `*.${config.domain}`,
      subjectAlternativeNames: [config.domain],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    return { hostedZone, certificate };
  }

  private createDistribution(
    config: EdgeStackConfig,
    originRequestFunction: cloudfront.experimental.EdgeFunction,
    viewerRequestFunction: cloudfront.Function,
    bucket: s3.Bucket,
    oai: cloudfront.OriginAccessIdentity,
    certificate: acm.Certificate
  ): cloudfront.Distribution {
    const cachePolicy = new cloudfront.CachePolicy(this, "FrontendCachePolicy", {
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

    const s3Origin = origins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
      originAccessIdentity: oai,
    });

    const edgeLambdas: cloudfront.EdgeLambda[] = [
      { functionVersion: originRequestFunction.currentVersion, eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST },
    ];

    const functionAssociations: cloudfront.FunctionAssociation[] = [
      { function: viewerRequestFunction, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
    ];

    const defaultBehavior: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy,
      functionAssociations,
      edgeLambdas,
    };

    const apiBehavior: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      functionAssociations,
      edgeLambdas,
    };

    return new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior,
      additionalBehaviors: { "/api/*": apiBehavior },
      certificate,
      domainNames: [`*.${config.domain}`, config.domain],
    });
  }

  private createDnsRecords(
    config: EdgeStackConfig,
    hostedZone: route53.IHostedZone,
    distribution: cloudfront.Distribution
  ): void {
    const target = route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution));

    new route53.ARecord(this, "WildcardARecord", {
      zone: hostedZone,
      recordName: `*.${config.domain}`,
      target,
    });

    new route53.ARecord(this, "RootARecord", {
      zone: hostedZone,
      recordName: config.domain,
      target,
    });
  }

  private createOutputs(
    _config: EdgeStackConfig,
    distribution: cloudfront.Distribution,
    bucket: s3.Bucket
  ): void {
    new cdk.CfnOutput(this, "DistributionId", { value: distribution.distributionId });
    new cdk.CfnOutput(this, "Domain", { value: distribution.distributionDomainName });
    new cdk.CfnOutput(this, "FrontendBucketName", { value: bucket.bucketName });
  }
}
