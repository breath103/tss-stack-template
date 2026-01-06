import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import path from "path";
import * as SSMParameters from "@app/shared/ssm-parameters";

const __dirname = import.meta.dirname;

interface EdgeStackProps extends cdk.StackProps {
  project: string;
  ssmRegion: string;
  domain: string;
  hostedZoneId: string;
}

export class EdgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EdgeStackProps) {
    super(scope, id, props);

    // Lambda@Edge for routing subdomains to backend URLs
    const originRequest = new cloudfront.experimental.EdgeFunction(
      this,
      "EdgeRouter",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../dist/origin-request")),
        timeout: cdk.Duration.seconds(5),
      }
    );

    // Allow Lambda@Edge to read SSM parameters
    originRequest.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${props.ssmRegion}:${this.account}:parameter/${props.project}/backend/*`,
        ],
      })
    );

    // S3 bucket for frontend assets
    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `${props.project}-frontend`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Origin Access Identity for CloudFront to access S3
    const oai = new cloudfront.OriginAccessIdentity(this, "OAI", {
      comment: `OAI for ${props.project} frontend`,
    });

    // Grant CloudFront read access to S3
    frontendBucket.grantRead(oai);

    // Store bucket name in SSM for frontend deploy script
    new ssm.StringParameter(this, "FrontendBucketParam", {
      parameterName: SSMParameters.frontendBucketName({ project: props.project }),
      stringValue: frontendBucket.bucketName,
    });

    // Import hosted zone
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domain,
      }
    );

    // Create wildcard certificate for subdomains
    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: `*.${props.domain}`,
      subjectAlternativeNames: [props.domain],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const domainNames = [`*.${props.domain}`, props.domain];

    // S3 origin for frontend assets
    const s3Origin = origins.S3BucketOrigin.withOriginAccessIdentity(frontendBucket, {
      originAccessIdentity: oai,
    });

    // CloudFront Function to extract subdomain at viewer-request
    // (before Host header is changed to S3 origin domain)
    const viewerRequestFn = new cloudfront.Function(this, "ViewerRequestFn", {
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, "../dist/viewer-request/index.js"),
      }),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: viewerRequestFn,
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
              function: viewerRequestFn,
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
      recordName: `*.${props.domain}`,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution)
      ),
    });

    // Root domain record
    new route53.ARecord(this, "RootARecord", {
      zone: hostedZone,
      recordName: props.domain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution)
      ),
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, "Domain", {
      value: `https://${props.domain}`,
    });

    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
    });
  }
}
