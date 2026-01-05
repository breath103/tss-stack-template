import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";
import path from "path";

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
    const edgeRouter = new cloudfront.experimental.EdgeFunction(
      this,
      "EdgeRouter",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../dist/edge-router")),
        timeout: cdk.Duration.seconds(5),
      }
    );

    // Allow Lambda@Edge to read SSM parameters
    edgeRouter.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${props.ssmRegion}:${this.account}:parameter/${props.project}/backend/*`,
        ],
      })
    );

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

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new origins.HttpOrigin("example.com"),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        edgeLambdas: [
          {
            functionVersion: edgeRouter.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
        ],
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
  }
}
