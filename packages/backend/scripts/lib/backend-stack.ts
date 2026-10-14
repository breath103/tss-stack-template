import path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

const ROOT = path.resolve(import.meta.dirname, "../..");

// How many HTTP requests one execution environment serves at once (1–128).
// Lambda may run fewer under load; this is the ceiling. Raise it for I/O-bound
// handlers, lower it if requests are CPU- or memory-heavy.
const MAX_CONCURRENCY_PER_ENVIRONMENT = 64;

interface BackendStackId {
  project: string;
  name: string;
}

// oxlint-disable-next-line local/no-single-use-type -- CDK stack props contract extending StackProps; the named interface is the idiom
interface BackendStackProps extends cdk.StackProps {
  project: string;
  name: string;
  envVars: Record<string, string>;
}

export class BackendStack extends cdk.Stack {
  static id({ project, name }: BackendStackId): string {
    return `${project}-backend-${name}`;
  }

  static functionName({ project, name }: BackendStackId): string {
    return `${project}-backend-${name}-handler`;
  }

  constructor(scope: Construct, props: BackendStackProps) {
    const id = BackendStack.id({ project: props.project, name: props.name });
    super(scope, id, props);

    const functionName = BackendStack.functionName({ project: props.project, name: props.name });
    const removalPolicy = props.name === "main" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // Web Functions read code straight from S3 as the Lambda service principal, pinned to an
    // object version — so the bucket must be versioned and grant Lambda read access.
    // Old zips are never pruned: a revision fails permanently once its object version is gone.
    const codeBucket = new s3.Bucket(this, "CodeBucket", {
      versioned: true,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy,
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
    });
    const bucketPolicy = codeBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("lambda.amazonaws.com")],
        actions: ["s3:GetObject", "s3:GetObjectVersion"],
        resources: [codeBucket.arnForObjects("*")],
        conditions: {
          ArnLike: {
            "aws:SourceArn": `arn:aws:lambda:${this.region}:${this.account}:web-function/${functionName}/revision/*`,
          },
        },
      })
    );
    const code = new s3deploy.BucketDeployment(this, "Code", {
      sources: [s3deploy.Source.asset(path.join(ROOT, "dist"))],
      destinationBucket: codeBucket,
      extract: false,
      prune: false,
    });

    // Lambda writes in-Region logs to `<group>.local`, then centralizes them into `<group>`.
    const logGroupName = `/aws/lambda/web/${functionName}`;
    const role = new iam.Role(this, "ExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    for (const [logicalId, name] of [
      ["LogGroup", logGroupName],
      ["LocalLogGroup", `${logGroupName}.local`],
    ]) {
      new logs.LogGroup(this, logicalId, {
        logGroupName: name,
        retention: logs.RetentionDays.TWO_MONTHS,
        removalPolicy,
      }).grantWrite(role);
    }

    const webFunction = new lambda.CfnWebFunction(this, "WebFunction", { functionName });

    const revision = new lambda.CfnWebFunctionRevision(this, "Revision", {
      functionName: webFunction.ref,
      buildConfig: {
        codeConfig: {
          s3Object: {
            bucket: codeBucket.bucketName,
            key: cdk.Fn.select(0, code.objectKeys),
            versionId: cdk.Fn.select(0, code.objectVersionIds),
          },
        },
        runtimeConfig: { runtime: "nodejs24.x" },
      },
      serviceConfig: {
        executionRoleArn: role.roleArn,
        timeoutSeconds: 30,
        maxConcurrencyPerEnvironment: MAX_CONCURRENCY_PER_ENVIRONMENT,
        environmentVariables: {
          AWS_LAMBDA_NODEJS_ENTRYPOINT: "web.js",
          NODE_ENV: "production",
          ...props.envVars,
        },
      },
    });
    // Lambda checks its S3 read access when the revision is created.
    if (bucketPolicy.policyDependable) revision.node.addDependency(bucketPolicy.policyDependable);

    // Public, like the Function URL it replaces; CloudFront in front, the app handles auth.
    const endpoint = new lambda.CfnWebFunctionEndpoint(this, "Endpoint", {
      functionName: webFunction.ref,
      endpointName: "default",
      endpointType: "HomeRegion",
      authType: "ApplicationManaged",
      revisionWeights: [{ revisionId: revision.attrRevisionId, weight: 100 }],
    });

    new cdk.CfnOutput(this, "EndpointUrl", {
      value: `https://${endpoint.attrDomainName}/`,
    });
  }
}
